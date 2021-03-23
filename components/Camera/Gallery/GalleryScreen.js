// @flow

import React, { useReducer, useEffect, useCallback, useRef } from "react";
import { Platform, StatusBar } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";

import { checkCameraRollPermissions } from "../../../utility/androidHelpers.android";
import styles from "../../../styles/camera/gallery";
import GalleryHeader from "./GalleryHeader";
import GalleryImageList from "./GalleryImageList";
import CameraError from "../CameraError";
import { fetchGalleryPhotos, checkForUniquePhotos } from "../../../utility/cameraRollHelpers";
import { colors } from "../../../styles/global";
import LoadingWheel from "../../UIComponents/LoadingWheel";

const GalleryScreen = () => {
  const navigation = useNavigation();
  // eslint-disable-next-line no-shadow
  const [state, dispatch] = useReducer( ( state, action ) => {
    switch ( action.type ) {
      case "SET_ALBUM":
        return {
          album: action.album,
          photos: [],
          error: null,
          hasNextPage: true,
          lastCursor: null,
          stillFetching: false,
          errorEvent: null,
          photoSelectedLoading: false,
          seen: new Set( )
        };
      case "FETCH_PHOTOS":
        return { ...state, stillFetching: true };
      case "APPEND_PHOTOS":
        return {
          ...state,
          photos: action.photos,
          stillFetching: false,
          hasNextPage: action.pageInfo.has_next_page,
          lastCursor: action.pageInfo.end_cursor
        };
      case "ERROR":
        return {
          ...state,
          error:
          action.error,
          errorEvent: action.errorEvent
        };
      case "SET_LOADING":
        return { ...state, photoSelectedLoading: true };
      case "RESET_LOADING":
        return { ...state, photoSelectedLoading: false };
      default:
        throw new Error();
    }
  }, {
    album: null,
    photos: [],
    hasNextPage: true,
    lastCursor: null,
    stillFetching: false,
    error: null,
    errorEvent: null,
    photoSelectedLoading: false,
    seen: new Set( )
  } );

  const {
    album,
    photos,
    hasNextPage,
    lastCursor,
    stillFetching,
    error,
    errorEvent,
    photoSelectedLoading,
    seen
  } = state;

  const photoCount = useRef( photos.length );
  photoCount.current = photos.length;

  const setLoading = useCallback( ( ) => dispatch( { type: "SET_LOADING" } ), [] );

  const setError = useCallback( ( newError, newErrorEvent ) => {
    if ( !error ) {
      dispatch( { type: "ERROR", error: newError, errorEvent: newErrorEvent } );
    }
  }, [error] );


  const appendPhotos = useCallback( ( data, pageInfo ) => {
    if ( data.length === 0 ) {
      // this is triggered in certain edge cases, like when iOS user has "selected albums"
      // permission but has not given Seek access to a single photo
      setError( "photos", null );
    } else {
      const uniquePhotos = checkForUniquePhotos( seen, data );
      dispatch( { type: "APPEND_PHOTOS", photos: photos.concat( uniquePhotos ), pageInfo } );
    }
  }, [photos, seen, setError] );

  const handleFetchError = useCallback( ( e ) => {
    if ( e.message === "Access to photo library was denied" ) {
      setError( "gallery", null );
    } else {
      setError( "photos", e.message );
    }
  }, [setError] );

  const fetchPhotos = useCallback( async ( ) => {
    dispatch( { type: "FETCH_PHOTOS" } );

    try {
      const results = await fetchGalleryPhotos( album, lastCursor );
      appendPhotos( results.edges, results.page_info );
    } catch ( e ) {
      handleFetchError( e );
    }
  }, [album, lastCursor, appendPhotos, handleFetchError] );

  const updateAlbum = useCallback( ( newAlbum: ?string ) => {
    // prevent user from reloading the same album twice
    if ( album === newAlbum ) { return; }
    dispatch( { type: "SET_ALBUM", album: newAlbum } );
  }, [album] );

  const onEndReached = useCallback( ( ) => {
    if ( hasNextPage && !stillFetching ) {
      fetchPhotos( );
    }
  }, [hasNextPage, fetchPhotos, stillFetching] );

  useEffect( ( ) => {
    if ( photos.length === 0 ) {
      fetchPhotos( );
    }
  }, [photos.length, fetchPhotos] );

  const initialFetch = useCallback( ( ) => {
    // attempting to fix issue on some iOS devices where photos never appear
    // assuming the above useEffect hook does not get called for some reason
    const timer = setTimeout( ( ) => {
      if ( photoCount.current === 0 ) {
        fetchPhotos( );
      }
    }, 3000 );

    if ( photoCount.current > 0 ) {
      clearTimeout( timer );
    }
    return ( ) => clearTimeout( timer );
  }, [fetchPhotos] );

  useEffect( ( ) => {
    const requestAndroidPermissions = async ( ) => {
      if ( Platform.OS === "android" ) {
        const permission = await checkCameraRollPermissions( );
        if ( permission !== true ) {
          setError( "gallery", null );
        }
      }
    };

    navigation.addListener( "focus", ( ) => {
      requestAndroidPermissions( );
      initialFetch( );
    } );
    navigation.addListener( "blur", ( ) => dispatch( { type: "RESET_LOADING" } ) );
  }, [navigation, initialFetch, setError] );

  const renderImageList = ( ) => {
    if ( error ) {
      return <CameraError error={error} errorEvent={errorEvent} />;
    }
    return <GalleryImageList onEndReached={onEndReached} photos={photos} setLoading={setLoading} />;
  };

  return (
    <SafeAreaView style={styles.background} edges={["top"]}>
      <StatusBar barStyle="dark-content" />
      <GalleryHeader updateAlbum={updateAlbum} />
      {renderImageList( )}
      {photoSelectedLoading && <LoadingWheel color={colors.white} />}
    </SafeAreaView>
  );
};

export default GalleryScreen;

// @flow

import React, { useState, useEffect, useCallback } from "react";
import {
  Platform,
  View,
  StatusBar,
  SafeAreaView
} from "react-native";
import CameraRoll from "@react-native-community/cameraroll";
import { useNavigation } from "@react-navigation/native";

import { checkCameraRollPermissions } from "../../../utility/androidHelpers.android";
import styles from "../../../styles/camera/gallery";
import GalleryHeader from "./GalleryHeader";
import GalleryContainer from "./GalleryContainer";
import LoadingWheel from "../../UIComponents/LoadingWheel";
import { colors } from "../../../styles/global";

const GalleryScreen = () => {
  const navigation = useNavigation();
  // const isFocused = useIsFocused();
  const [album, setAlbum] = useState( null );
  const [photos, setPhotos] = useState( [] );
  const [error, setError] = useState( null );
  const [hasNextPage, setHasNextPage] = useState( true );
  const [lastCursor, setLastCursor] = useState( null );
  const [stillLoading, setStillLoading] = useState( false );
  const [loading, setLoading] = useState( false );
  const groupTypes = ( album === null ) ? "All" : "Album";

  const appendPhotos = useCallback( ( data, pageInfo ) => {
    if ( photos.length === 0 && data.length === 0 && !pageInfo.has_next_page ) {
      setError( "photos" );
    } else {
      const updatedPhotos = photos.concat( data );
      setPhotos( updatedPhotos );
      setStillLoading( false );
      setLoading( false );
    }
    setHasNextPage( pageInfo.has_next_page );
    setLastCursor( pageInfo.end_cursor );
  }, [photos] );

  const fetchPhotos = useCallback( ( photoOptions ) => {
    console.log( photoOptions, "fetching photos" );
    if ( hasNextPage && !stillLoading ) {
      setStillLoading( true );

      CameraRoll.getPhotos( photoOptions ).then( ( results ) => {
        appendPhotos( results.edges, results.page_info );
      } ).catch( ( { message } ) => {
        if ( message === "Access to photo library was denied" ) {
          setError( "gallery" );
        }
      } );
    }
  }, [hasNextPage, stillLoading, appendPhotos] );

  const setPhotoParams = useCallback( () => {
    const photoOptions = {
      first: 28, // only 28 at a time can display
      assetType: "Photos",
      groupTypes // this is required in RN 0.59+,
    };

    if ( album ) { // append for cases where album isn't null
      // $FlowFixMe
      photoOptions.groupName = album;
    }

    if ( lastCursor ) {
      // $FlowFixMe
      photoOptions.after = lastCursor;
    }

    fetchPhotos( photoOptions );
  }, [groupTypes, album, lastCursor, fetchPhotos] );

  useEffect( () => {
    setPhotos( [] );
    setError( null );
    setHasNextPage( true );
    setLastCursor( null );
    setStillLoading( false );
  }, [album] );

  const updateAlbum = useCallback( ( newAlbum: string ) => {
    console.log( newAlbum, "new album" );
    setLoading( true );
    setAlbum( newAlbum !== "All" ? newAlbum : null );
  }, [] );

  const setupPhotos = useCallback( () => {
    if ( photos.length === 0 ) {
      console.log( "setting photo params" );
      setPhotoParams();
    }
  }, [photos.length, setPhotoParams] );

  const renderLoadingWheel = () => (
    <View style={styles.loadingWheel}>
      <LoadingWheel color={colors.darkGray} />
    </View>
  );

  const startLoading = useCallback( () => setLoading( true ), [] );

  useEffect( () => {
    navigation.addListener( "focus", () => {
      setLoading( true );
      if ( Platform.OS === "android" ) {
        const requestAndroidPermissions = async () => {
          const permission = await checkCameraRollPermissions();
          if ( permission === true ) {
            setupPhotos();
          } else {
            setError( "gallery" );
          }
        };
        requestAndroidPermissions();
      } else {
        setupPhotos();
      }
    } );

    navigation.addListener( "blur", () => {
      setLoading( false );
    } );
  }, [navigation, setupPhotos] );

  console.log( loading, photos.length, "is loading" );

  return (
    <View style={styles.background}>
      <SafeAreaView style={styles.safeViewTop} />
      <StatusBar barStyle="dark-content" />
      <GalleryHeader updateAlbum={updateAlbum} />
      {loading && renderLoadingWheel()}
      <GalleryContainer
        setPhotoParams={setPhotoParams}
        error={error}
        photos={photos}
        startLoading={startLoading}
        loading={loading}
      />
    </View>
  );
};

export default GalleryScreen;

// @flow
import { Platform } from "react-native";
import inatjs from "inaturalistjs";

import iconicTaxaIds from "./dictionaries/iconicTaxonDictById";
import createUserAgent from "./userAgent";
import { fetchSpeciesSeenDate } from "./dateHelpers";
import { addToCollection } from "./observationHelpers";
import { fetchTruncatedUserLocation } from "./locationHelpers";
import { checkLocationPermissions } from "./androidHelpers.android";

const setAncestorIdsiOS = ( predictions: Array<Object> ): Array<number> => {
  // adding ancestor ids to take iOS camera experience offline
  const ancestorIds = predictions.map( ( p ) => Number( p.taxon_id ) );
  return ancestorIds.sort( );
};

const setSpeciesSeenImage = ( taxa ) => {
  return taxa && taxa.taxon_photos[0] ? taxa.taxon_photos[0].photo.medium_url : null;
};

const createAncestor = ( ancestor: {
  taxon_id: number,
  name: string,
  rank: number
}, taxa: ?{
  taxon_photos: Array<Object>
} ) => {
  return {
    taxaId: ancestor.taxon_id,
    speciesSeenImage: setSpeciesSeenImage( taxa ),
    scientificName: ancestor.name,
    rank: ancestor.rank
  };
};

const createSpecies = ( species: {
  taxon_id: number,
  name: string
}, taxa: ?{
  taxon_photos: Array<Object>
} ) => {
  return {
    taxaId: Number( species.taxon_id ),
    speciesSeenImage: setSpeciesSeenImage( taxa ),
    scientificName: species.name
  };
};

const checkForSpecies = ( predictions: Array<Object>, threshold: number ) => {
  return predictions.find( leaf => (
    leaf.rank === 10 && leaf.score > threshold
  ) );
};

const checkForAncestor = ( predictions: Array<Object>, threshold: number ) => {
  const reversePredictions = predictions.reverse();
  const ancestor = reversePredictions.find( leaf => leaf.score > threshold );

  if ( ancestor && ancestor.rank !== 100 ) {
    return ancestor;
  }
  return null;
};

const checkForIconicTaxonId = ( ancestorIds: Array<number> ) => {
  const taxaIdList = Object.keys( iconicTaxaIds ).reverse();
  taxaIdList.pop();
  taxaIdList.push( 47686, 48222 ); // checking for protozoans and kelp

  const newTaxaList = [];

  taxaIdList.forEach( ( id ) => {
    newTaxaList.push( Number( id ) );
  } );

  const iconicTaxonId = newTaxaList.filter( ( value ) => ancestorIds.indexOf( value ) !== -1 );

  return iconicTaxonId[0] || 1;
};

const createObservationForRealm = ( species: {
  taxon_id: number,
  name: string,
  ancestor_ids: Array<number>
}, taxa: ?{
  default_photo: Object
} ) => {
  return {
    taxon: {
      default_photo: taxa && taxa.default_photo ? taxa.default_photo : null,
      id: Number( species.taxon_id ),
      name: species.name,
      iconic_taxon_id: checkForIconicTaxonId( species.ancestor_ids ),
      ancestor_ids: species.ancestor_ids
    }
  };
};

// online results helpers
const findNearestPrimaryRankTaxon = ( ancestors: Array<Object>, rank: number ) => {
  if ( rank <= 20 ) {
    return ancestors.find( r => r.rank_level === 20 );
  } else if ( rank <= 30 ) {
    return ancestors.find( r => r.rank_level === 30 );
  } else if ( rank <= 40 ) {
    return ancestors.find( r => r.rank_level === 40 );
  } else if ( rank <= 50 ) {
    return ancestors.find( r => r.rank_level === 50 );
  }
};

const checkCommonAncestorRank = ( rank: number ) => {
  const primaryRanks = [20, 30, 40, 50];

  if ( primaryRanks.includes( rank ) ) {
    return true;
  }
  return false;
};

const createOnlineAncestor = ( ancestor: {
  id: number,
  name: string,
  default_photo: Object,
  rank_level: number
} ) => {
  const photo = ancestor.default_photo;

  return {
    taxaId: ancestor.id,
    speciesSeenImage: photo ? photo.medium_url : null,
    scientificName: ancestor.name,
    rank: ancestor.rank_level
  };
};

const createOnlineSpecies = ( species: {
  id: number,
  name: string,
  default_photo: Object
} ) => {
  const photo = species.default_photo;

  return {
    taxaId: species.id,
    speciesSeenImage: photo ? photo.medium_url : null,
    scientificName: species.name
  };
};

// shared online and offline
const navToMatch = async ( navigation, taxon, image, seenDate, errorCode: ?number ) => {
  navigation.push( "Drawer", {
    screen: "Main",
    params: {
      screen: "Match",
      params: {
        taxon,
        image,
        seenDate,
        errorCode
      }
    }
  } );
};

const setImageCoords = ( coords?: {
  latitude: number,
  longitude: number,
  accuracy: number
}, image: Object ) => {
  if ( coords )  {
    const { latitude, longitude, accuracy } = coords;

    image.latitude = latitude;
    image.longitude = longitude;
    image.accuracy = accuracy;
  }

  return image;
};

const fetchPhoto = async ( id: number ) => {
  const options = { user_agent: createUserAgent( ) };

  try {
    const { results } = await inatjs.taxa.fetch( id, options );
    const taxa = results[0];
    return taxa;
  } catch ( e ) {
    return null;
  }
};

const fetchImageLocationOrErrorCode = async ( image: {
  latitude?: number
} ): Promise<{ image: Object, errorCode: ?number }> => {
  const permissionAndroid = await checkLocationPermissions( );
  // need to specify permission check only for android

  if ( image.latitude ) { return { image, errorCode: null }; }

  if ( permissionAndroid && Platform.OS === "android" || Platform.OS === "ios" ) {
    try {
      const coords = await fetchTruncatedUserLocation( );
      return { image: setImageCoords( coords, image ), errorCode: null };
    } catch ( code ) {
      return { image, errorCode: code };
    }
  }
  return { image, errorCode: 1 };
};

const fetchOfflineResults = async ( userImage: {
  time: number,
  uri: string,
  predictions: Array<Object>,
  latitude?: number
}, navigation: any ) => {
  const threshold = 0.7;

  // AR camera photos don't come with a location
  // especially when user has location permissions off
  // this is also needed for ancestor screen, species nearby
  const { image, errorCode } = await fetchImageLocationOrErrorCode( userImage );

  // get user location (for species nearby on match screen) || obs for realm
  const species = checkForSpecies( userImage.predictions, threshold );
  const ancestor = checkForAncestor( userImage.predictions, threshold );

  if ( species ) {
    if ( Platform.OS === "ios" ) {
      species.ancestor_ids = setAncestorIdsiOS( image.predictions );
    }

    const seenDate = await fetchSpeciesSeenDate( Number( species.taxon_id ) );
    const taxa = await fetchPhoto( species.taxon_id );

    if ( !seenDate ) {
      const newObs = createObservationForRealm( species, taxa );
      await addToCollection( newObs, image );
    }
    const taxon = createSpecies( species, taxa );
    navToMatch( navigation, taxon, image, seenDate, errorCode );

  } else if ( ancestor ) {
    const taxa = await fetchPhoto( ancestor.taxon_id );
    const taxon = createAncestor( ancestor, taxa );
    navToMatch( navigation, taxon, image, null, errorCode );
  } else {
    // no match
    navToMatch( navigation, { }, userImage, null, null );
  }
};

export {
  setAncestorIdsiOS,
  createSpecies,
  createAncestor,
  checkForSpecies,
  checkForAncestor,
  createObservationForRealm,
  findNearestPrimaryRankTaxon,
  checkCommonAncestorRank,
  createOnlineSpecies,
  createOnlineAncestor,
  navToMatch,
  setImageCoords,
  fetchOfflineResults
};

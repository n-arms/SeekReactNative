import React, { useCallback, useState, useEffect } from "react";
import {
  View,
  Image,
  Text,
  TouchableOpacity,
  BackHandler
} from "react-native";
import { useNavigation, useRoute, useFocusEffect } from "@react-navigation/native";

import i18n from "../../i18n";
import iconicTaxaNames from "../../utility/dictionaries/iconicTaxonDict";
import SpeciesPhotos from "./SpeciesPhotos";
import styles from "../../styles/species/species";
import icons from "../../assets/icons";
import { useCommonName } from "../../utility/customHooks";
import { getRoute } from "../../utility/helpers";

type Props = {
  photos: Array<Object>,
  taxon: Object,
  seenTaxa: ?Object,
  id: ?Number
}

const SpeciesHeader = ( {
  photos,
  seenTaxa,
  taxon,
  id
}: Props ) => {
  const navigation = useNavigation();
  const { navigate } = navigation;
  const { params } = useRoute();
  const [routeName, setRouteName] = useState( null );
  const commonName = useCommonName( id );

  const fetchRoute = async () => {
    const route = await getRoute();
    setRouteName( route );
  };

  const { scientificName, iconicTaxonId } = taxon;

  const backAction = useCallback( () => {
    if ( routeName ) {
      navigate( routeName, { ...params } );
    } else {
      navigate( "Home" );
    }
  }, [navigate, routeName, params] );

  useEffect( () => {
    navigation.addListener( "focus", () => {
      fetchRoute();
    } );
  }, [navigation] );

  useFocusEffect(
    useCallback( () => {
      const onBackPress = () => {
        backAction();
        return true; // following custom Android back behavior template in React Navigation
      };

      BackHandler.addEventListener( "hardwareBackPress", onBackPress );

      return () => BackHandler.removeEventListener( "hardwareBackPress", onBackPress );
    }, [backAction] )
  );

  return (
    <View style={styles.background}>
      <TouchableOpacity
        accessibilityLabel={i18n.t( "accessibility.back" )}
        accessible
        onPress={() => backAction()}
        style={styles.backButton}
      >
        <Image source={icons.backButton} />
      </TouchableOpacity>
      <SpeciesPhotos
        photos={photos}
        seenTaxa={seenTaxa}
      />
      <View style={styles.greenBanner}>
        {iconicTaxonId && (
          <Text style={styles.iconicTaxaText}>
            {i18n.t( iconicTaxaNames[iconicTaxonId] ).toLocaleUpperCase()}
          </Text>
        )}
      </View>
      <View style={styles.textContainer}>
        <Text style={styles.commonNameText}>{commonName || scientificName}</Text>
        <Text style={styles.scientificNameText}>{scientificName}</Text>
      </View>
    </View>
  );
};

export default SpeciesHeader;

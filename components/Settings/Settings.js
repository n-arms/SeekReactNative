// @flow

import React, { useContext } from "react";
import { View } from "react-native";
import type { Node } from "react";

import { viewStyles } from "../../styles/settings";
import { UserContext } from "../UserContext";
import LanguagePicker from "./LanguagePicker";
import ScrollWithHeader from "../UIComponents/Screens/ScrollWithHeader";
import DonateButton from "./DonateButton";
import CameraSettings from "./CameraSettings";
import SpeciesDetail from "./SpeciesDetail";

const SettingsScreen = (): Node => {
  const { login } = useContext( UserContext );

  return (
    <ScrollWithHeader header="menu.settings">
      <View style={[viewStyles.marginHorizontal, viewStyles.marginTop]}>
        <CameraSettings />
        <SpeciesDetail />
        <LanguagePicker />
        {login && <DonateButton />}
      </View>
    </ScrollWithHeader>
  );
};

export default SettingsScreen;

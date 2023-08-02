import config from "../config";

export default {
  ANDROIDMODEL: config.ANDROID_MODEL_FILE_NAME,
  ANDROIDTAXONOMY: config.ANDROID_TAXONOMY_FILE_NAME,
  IOSMODEL: `${config.IOS_MODEL_FILE_NAME}c`,
  IOSTAXONOMY: config.IOS_TAXONOMY_FILE_NAME
};

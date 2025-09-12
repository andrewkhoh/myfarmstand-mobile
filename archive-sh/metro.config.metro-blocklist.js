const { getDefaultConfig } = require('expo/metro-config');
const { MetroApi } = require('@expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Use Metro's BlockList API instead of regex
const { BlockList } = require('metro');

config.resolver = {
  ...config.resolver,
  blockList: BlockList.create([
    /.*\/ARCHIVE\/.*/,
  ]),
};

module.exports = config;
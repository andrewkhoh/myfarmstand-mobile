module.exports = {
  View: 'View',
  Text: 'Text',
  TouchableOpacity: 'TouchableOpacity',
  ScrollView: 'ScrollView',
  FlatList: 'FlatList',
  ActivityIndicator: 'ActivityIndicator',
  TextInput: 'TextInput',
  Button: 'Button',
  Alert: {
    alert: jest.fn()
  },
  Platform: {
    OS: 'ios',
    select: (obj) => obj.ios || obj.default
  },
  StyleSheet: {
    create: (styles) => styles,
    flatten: (style) => style
  },
  Dimensions: {
    get: () => ({ width: 375, height: 812 })
  }
};

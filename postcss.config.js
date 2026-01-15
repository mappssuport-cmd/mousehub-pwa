export default {
  plugins: {
    'autoprefixer': {
      overrideBrowserslist: [
        'last 3 versions',
        'iOS >= 10',
        'Android >= 5',
        'Chrome >= 60',
        'Safari >= 11'
      ]
    },
    'postcss-preset-env': {
      stage: 3,
      features: {
        'nesting-rules': true,
        'custom-properties': true
      }
    }
  }
};
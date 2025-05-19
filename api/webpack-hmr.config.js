const nodeExternals = require('webpack-node-externals');
const { RunScriptWebpackPlugin } = require('run-script-webpack-plugin');

module.exports = function (options, webpack) {
  return {
    ...options,
    entry: ['webpack/hot/poll?100', options.entry],
    externals: [
      nodeExternals({
        allowlist: ['webpack/hot/poll?100'],
      }),
    ],
    plugins: [
      ...options.plugins,
      new webpack.HotModuleReplacementPlugin(),
      new webpack.WatchIgnorePlugin({
        paths: [/\.js$/, /\.d\.ts$/],
      }),
      new RunScriptWebpackPlugin({
        name: options.output.filename,
        autoRestart: true,
        nodeArgs: ['--inspect=0.0.0.0:9229'],
      }),
    ],
    watchOptions: {
      ignored: ['**/node_modules', '**/dist'],
      poll: 1000,
      aggregateTimeout: 300,
    },
    mode: 'development',
    devtool: 'source-map',
  };
}; 

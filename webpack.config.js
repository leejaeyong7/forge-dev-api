/*============================================================================
 * @author     : Jae Yong Lee (leejaeyong7@gmail.com)
 * @file       : webpack.config.js
 * @brief      : Webpack configuration file
 * Copyright (c) Jae Yong Lee
 =============================================================================*/
//----------------------------------------------------------------------------//
//                                  INCLUDES                                  //
//----------------------------------------------------------------------------//
var path = require('path');
var HtmlWebpackPlugin = require('html-webpack-plugin');
var webpack = require('webpack');
//----------------------------------------------------------------------------//
//                                END INCLUDES                                //
//----------------------------------------------------------------------------//
//----------------------------------------------------------------------------//
//                             MODULE DEFINITION                              //
//----------------------------------------------------------------------------//
module.exports = {
    entry:[
      'webpack/hot/only-dev-server', // "only" prevents reload on syntax errors,
      './src/main'
    ],
    output: {
      path: path.resolve(__dirname, './dist'),
      filename: "js/bundle.js"
    },
    resolve: {
        extensions: ["", ".webpack.js", ".web.js", ".js"]
    },  
    plugins:[
      new HtmlWebpackPlugin({
        template: 'src/index.html'
      }),
      new HtmlWebpackPlugin({
        filename: "viewer.html",
        template: 'src/viewer.html'
      }),
      new webpack.HotModuleReplacementPlugin()
    ]
};
//----------------------------------------------------------------------------//
//                           END MODULE DEFINITION                            //
//----------------------------------------------------------------------------//

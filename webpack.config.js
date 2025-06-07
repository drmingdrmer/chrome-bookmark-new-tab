const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = (env, argv) => {
    const isProduction = argv.mode === 'production';

    return {
        entry: {
            'new-tab': './src/index.tsx',
        },
        output: {
            path: path.resolve(__dirname, 'dist'),
            filename: '[name].js',
            clean: true,
        },
        resolve: {
            extensions: ['.tsx', '.ts', '.js', '.jsx'],
            alias: {
                '@': path.resolve(__dirname, 'src'),
            },
        },
        module: {
            rules: [
                {
                    test: /\.tsx?$/,
                    use: 'ts-loader',
                    exclude: /node_modules/,
                },
                {
                    test: /\.css$/i,
                    use: [
                        'style-loader',
                        'css-loader',
                        {
                            loader: 'postcss-loader',
                            options: {
                                postcssOptions: {
                                    plugins: [
                                        require('tailwindcss'),
                                        require('autoprefixer'),
                                    ],
                                },
                            },
                        },
                    ],
                },
                {
                    test: /\.(png|svg|jpg|jpeg|gif)$/i,
                    type: 'asset/resource',
                },
            ],
        },
        plugins: [
            new HtmlWebpackPlugin({
                template: './src/new-tab.html',
                filename: 'new-tab.html',
                chunks: ['new-tab'],
                inject: 'body',
            }),
        ],
        devtool: isProduction ? false : 'source-map',
        optimization: {
            minimize: isProduction,
        },
    };
}; 
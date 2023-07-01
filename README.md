# My TypeScript Website

This is a simple website built with TypeScript and Express.

## Structure

The main entry point of the application is `src/index.ts`. This file imports and uses the express application from `src/app.ts` and also imports any necessary utilities from `src/utils/helpers.ts` and `src/utils/constants.ts`.

The express application is set up in `src/app.ts`. This file imports and uses the routes from `src/routes/home.ts`, `src/routes/about.ts`, and `src/routes/contact.ts`. It also imports any necessary components from `src/components/header.ts`, `src/components/footer.ts`, and `src/components/navigation.ts`.

The routes for the application are defined in `src/routes/*.ts`. These files import and use any necessary components from `src/components/*.ts` and also import any necessary utilities from `src/utils/helpers.ts` and `src/utils/constants.ts`.

The components used in the application are defined in `src/components/*.ts`. These files import and use any necessary styles from `src/styles/*.css` and also import any necessary utilities from `src/utils/helpers.ts` and `src/utils/constants.ts`.

The styles used in the application are defined in `src/styles/*.css`.

Utilities and constants used throughout the application are defined in `src/utils/helpers.ts` and `src/utils/constants.ts`.

The HTML structure of the application is defined in `public/*.html`. These files link to the compiled JavaScript from `public/assets/js/main.js` and the compiled CSS from `public/assets/css/styles.css`. They also use images from `public/assets/images/*.png` and `public/assets/images/*.jpg`.

The compiled JavaScript of the application is in `public/assets/js/main.js`.

The compiled CSS of the application is in `public/assets/css/styles.css`.

The images used in the application are in `public/assets/images/*.png` and `public/assets/images/*.jpg`.

## Setup

To set up the application, first install the dependencies with `npm install`. Then, start the application with `npm start`.

## Build

To build the application, run `npm run build`.

## Test

To test the application, run `npm test`.

## License

This project is licensed under the MIT License.
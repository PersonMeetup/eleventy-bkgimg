# Eleventy Background Image

A transform that allows Eleventy Image to parse `url()` functions in CSS; now even background images can be optimized!

To see this plugin in action, clone the repo then run the demo site with `npm run test`.

## Installation

Install the npm package and add it to your `.eleventy.js` file as per usual. You can also pass the plugin your [configuration options](https://www.11ty.dev/docs/plugins/image/#options) if needed.

```
npm install eleventy-bkgimg --save
```

```js
import eleventyBkgimg from "./index.js";

export default function (eleventyConfig) {
	eleventyConfig.addPlugin(eleventyBkgimg, { ImageOptions });
}
```

Keep in mind you'll also need to add `css` as a templating language before stylesheets can be processed.

```js
eleventyConfig.addTemplateFormats("css");
eleventyConfig.addExtension("css", {
	outputFileExtension: "css",
	compile: async (inputContent) => {
		return async () => {
			return inputContent;
		};
	},
});
```

## Usage

Much of this plugin's functionality aims for parity with the existing [HTML Transform](https://www.11ty.dev/docs/plugins/image/#html-transform), replicating much of its behaviour.

```css
.local {
	background: url(/address/landscape2.jpg);
}
.remote {
	background: url(https://images.unsplash.com/photo-1464802686167-b939a6910659);
}
```

Individual images can still be given [attribute overrides](https://www.11ty.dev/docs/plugins/image/#attribute-overrides) through the use of URL search parameters:

```css
.widths {
	background: url(dude.jpg?widths=1237);
}
.formats {
	background: url(pancakes.jpg?formats="jpeg");
}
.ignore {
	background: url(incomingcall.jpg?ignore);
}
.output {
	background: url(gardeningtool.jpg?output=./notanhammer/);
}
```

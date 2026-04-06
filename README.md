# Eleventy Background Image

## Installation

```
npm install eleventy-bkgimg --save
```

```js
import eleventyBkgimg from "./index.js";

export default function (eleventyConfig) {
	eleventyConfig.addPlugin(eleventyBkgimg, );
}
```

## Usage

```css
.local {
	background: url(/address/landscape2.jpg);
}
.remote {
	background: url(https://images.unsplash.com/photo-1464802686167-b939a6910659);
}
.with-overrides {
	background: url(/address/landscape2.jpg?widths=1237);
}
```

https://www.11ty.dev/docs/plugins/image/#attribute-overrides

## Configuration

https://www.11ty.dev/docs/plugins/image/#options

import eleventyBkgimg from "./index.js";

/** @param {import("@11ty/eleventy/UserConfig").default} eleventyConfig */
export default function (eleventyConfig) {
	eleventyConfig.addPlugin(eleventyBkgimg, {
		extensions: "html,njk,liquid,css,webc",
	});
	eleventyConfig.setInputDirectory("test");
}

import eleventyBkgimg from "./index.js";
import { eleventyImageTransformPlugin } from "@11ty/eleventy-img";

/** @param {import("@11ty/eleventy/UserConfig").default} eleventyConfig */
export default function (eleventyConfig) {
	eleventyConfig.addPlugin(eleventyBkgimg, {
		extensions: "html,njk,liquid,css,webc",
	});
	eleventyConfig.setInputDirectory("test");
	eleventyConfig.addPlugin(eleventyImageTransformPlugin);
}

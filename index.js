import EleventyImage from "@11ty/eleventy-img";
import DEFAULTS from "@11ty/eleventy-img/src/global-options.js";
import path from "node:path";
import { copyFileSync } from "node:fs";

/**
 * Searches for `url()` values within templates and stylesheets,
 * optimizing any referenced images
 *
 * NOTE: When I get around to properly developing this as a standalone
 * plugin, keep note of the work done in the transform plugin:
 * https://github.com/11ty/eleventy-img/blob/main/src/transform-plugin.js#L64
 * @param {import("@11ty/eleventy/UserConfig").default} eleventyConfig
 * @param {import("@11ty/eleventy-img/").ImageOptions} options Eleventy Image config
 */
export default function (eleventyConfig, options = {}) {
	const INPUT_DIR = eleventyConfig.directories.input;
	const OUTPUT_DIR = eleventyConfig.directories.output;

	/** @type {import("@11ty/eleventy-img/").ImageOptions}  */
	let pluginOptions = Object.assign({
		// If urlPath not set, assume default setting
		outputDir: path.join(OUTPUT_DIR, options.urlPath || "/img/"),
		extensions: "html,njk,liquid,css",
	}, options);

	// TODO: Make sure this doesn't conflict with other plugins, such as the PostCSS one!
	eleventyConfig.addTemplateFormats("css");
	eleventyConfig.addExtension("css", {
		outputFileExtension: "css",
		compile: async (inputContent) => {
			return async () => {
				return inputContent;
			};
		},
	});

	// TODO: During watch, images without formatting options default to lowest resolution?
	eleventyConfig.addPreprocessor(
		"bkgimg",
		pluginOptions.extensions,
		async (data, content) => {
			let dataErrors = [];
			if (typeof content == "string") {
				// Grab the `url()` snippet, check for image
				let images = content
					.match(/url\(.*\)/g)
					?.filter((url) => !url.includes(".css"));
				if (!images) return content;

				image: for (let img of images) {
					// Remove function syntax from address
					if (img.match(/url\(("|').*\)/g))
						img = img.slice(5, -2);
					else
						img = img.slice(4, -1);

					// Check if the address is local or external
					let local = false;
					let address = img;
					if (!URL.canParse(address)) {
						local = true
						if (!path.isAbsolute(img)) {
							address = path.join(data.page.fileSlug, img);
						}
						// Add a fake address to the start for the URL object
						address = path.join('a:/', address);
					}
					const url = new URL(address);

					for (let [key, value] of url.searchParams) {
						// TODO: Aim for parity with https://www.11ty.dev/docs/plugins/image/#attribute-overrides
						switch (key) {
							case "widths":
							case "width":
								try {
									value = JSON.parse(value);
									if (!Array.isArray(value)) value = [value];
									if (value.length > 1)
										dataErrors.push(`'widths': Warning: Multiple values given, will use smallest option (${img})`)
									value.forEach(check => {
										if (typeof (check) == "string" && !(check == "auto"))
											throw new Error('Invalid string value (Did you mean to set "auto"?)');
									});
									pluginOptions.widths = value;
								} catch (error) {
									pluginOptions.widths = ["auto"];
									dataErrors.push(`'widths': ${error} (${img})`)
								}
								break;

							case "formats":
							case "format":

								// TODO: is this needed?
								/** @type {import("@11ty/eleventy-img/").ImageFormat}  */
								const FORMATS = ['webp', 'jpeg', 'png', 'svg', 'avif', 'gif', 'auto'];
								try {
									value = JSON.parse(value);
									if (!Array.isArray(value)) value = [value];
									if (value.length > 1)
										dataErrors.push(`'widths': Warning: Multiple values given, will use first option (${img})`)
									value.forEach(check => {
										if (!typeof (check) == "string" || !(FORMATS.includes(check)))
											throw new Error('Invalid string value (Did you mean to set "auto"?)');
									});
									pluginOptions.formats = value;
									pluginOptions.formats = ['']
								} catch (error) {
									pluginOptions.formats = ["auto"];
									dataErrors.push(`'formats': ${error} (${img})`)
								}
								break;

							case "ignore":
								if (local) {
									let src = url.pathname;
									copyFileSync(path.join(INPUT_DIR, src), path.join(OUTPUT_DIR, src));
									content = content.replace(img, src);
								}
								continue image;

							case "optional":
								if (value == "keep") { }
								if (value == "placeholder") { }
								break;

							// May not be the best idea???
							case "output":

								break;

							default:
								dataErrors.push(`Invalid argument: ${key}(${img})`)
						}
					};

					let src = '';
					if (local)
						src = path.join(INPUT_DIR, url.pathname);
					else
						src = url.href;

					// Simplify options
					if (pluginOptions.widths?.length > 1) {
						const index = pluginOptions.widths.findIndex((i) => i == "auto");
						if (typeof (index) == "number") {
							pluginOptions.widths = [Math.min(
								...pluginOptions.widths.toSpliced(index, 1, Infinity)
							)];
						}
					}
					pluginOptions.formats = [pluginOptions.formats?.at(0) || 'webp'];

					let imgPath = await EleventyImage(src, pluginOptions);
					content = content.replace(img, imgPath[pluginOptions.formats[0]][0].url);
				}
			}

			if (dataErrors.length > 0) {
				let msg = `Problems while preprocessing url() functions in ${data.page.inputPath} `;
				let i = 1
				dataErrors.forEach(error => {
					msg += `\n${i++}. ${error} `
				});
				eleventyConfig?.logger?.logWithOptions({
					message: msg,
					prefix: "[11ty/11ty-bkgimg]",
					color: "yellow",
				});
			}

			return `${content} `;
		},
	);

	// eleventyConfig.htmlTransformer.addPosthtmlPlugin("html", asdf, { priority: -1 });
}

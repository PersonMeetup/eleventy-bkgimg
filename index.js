import EleventyImage from "@11ty/eleventy-img";
import { Util } from "@11ty/eleventy-img";
import path from "node:path";

/**
 * Searches for `url()` values within templates and stylesheets,
 * optimizing any referenced images
 *
 * @param {import("@11ty/eleventy/UserConfig").default} eleventyConfig User-land configuration instance
 * @param {import("@11ty/eleventy-img/").ImageOptions} options Eleventy Image options
 */
export default function (eleventyConfig, options = {}) {
	const INPUT_DIR = eleventyConfig.directories.input;
	const OUTPUT_DIR = eleventyConfig.directories.output;

	/** @type {import("@11ty/eleventy-img/").ImageOptions}  */
	let pluginOptions = Object.assign(
		{
			// If urlPath not set, assume default setting
			outputDir: path.join(OUTPUT_DIR, options.urlPath || "/img/"),
		},
		options,
	);

	function replaceContext(content, context, orgUrl, newUrl) {
		return content.replace(context, context.replace(orgUrl, newUrl));
	}

	async function transformBackgrounds(page, content) {
		if (typeof content == "string") {
			let dataErrors = [];
			let images = [];
			// Look for url() functions in background properties
			const backgrounds = content.matchAll(
				/(?:.|\s){2,9}(?<!\/\*)background(?:.?|-image):.*?url\(.*?\)(?:.|\s){1,9}?/g,
			);
			for (const bkg of backgrounds) {
				// Isolate the image path
				const url = bkg[0].match(/url\((?:'|"?)(.*?)(?:'|"?)\)/).at(1);
				if (url !== "" || !url.includes(".css"))
					images.push({
						bkgCtx: bkg[0],
						bkgUrl: url,
					});
			}

			image: for (let img of images) {
				const { inputPath, url } = page;
				const { bkgUrl, bkgCtx } = img;
				const address = Util.normalizeImageSource(
					{ input: INPUT_DIR, inputPath },
					bkgUrl,
				);
				/** @type {import("@11ty/eleventy-img/").ImageOptions}  */
				let imageOptions = Object.assign({}, pluginOptions);

				// Check if the address is local or external
				let local = false;
				if (!URL.canParse(address)) local = true;

				const params = new URL(path.join(local ? "a:/" : "", address)).search;
				const imgSrc = address.replace(decodeURIComponent(params), "");

				for (let [key, value] of new URLSearchParams(params)) {
					// TODO: Aim for parity with https://www.11ty.dev/docs/plugins/image/#attribute-overrides
					switch (key) {
						case "widths":
						case "width":
							try {
								value = JSON.parse(value);
								if (!Array.isArray(value)) value = [value];
								if (value.length > 1)
									dataErrors.push(
										`Warning: Multiple widths given, will use smallest option (${bkgUrl})`,
									);
								value.forEach((check) => {
									if (
										typeof check == "string" &&
										isNaN(parseInt(check)) &&
										check != "auto"
									)
										throw new Error(
											'Invalid string value for width (Did you mean to set "auto"?)',
										);
								});
								imageOptions.widths = value;
							} catch (error) {
								imageOptions.widths = ["auto"];
								dataErrors.push(`${error} (${bkgUrl})`);
							}
							break;

						case "formats":
						case "format":
							try {
								value = JSON.parse(value);
								if (!Array.isArray(value)) value = [value];
								if (value.length > 1)
									dataErrors.push(
										`Warning: Multiple formats given, will use first option (${bkgUrl})`,
									);
								// We can't do much preemptive filtering, but we can look for strings
								if (!typeof value[0] == "string")
									throw new Error("Invalid value type, expected string");
								imageOptions.formats = value;
							} catch (error) {
								imageOptions.formats = ["auto"];
								dataErrors.push(`'formats': ${error} (${bkgUrl})`);
							}
							break;

						case "ignore":
							content = replaceContext(
								content,
								bkgCtx,
								bkgUrl,
								bkgUrl.replace(decodeURIComponent(params), ""),
							);
							continue image;

						// May not be the best idea???
						case "output":
							try {
								// It's okay if this fails; we just needed to clean quotes
								value = JSON.parse(value);
							} catch {}
							if (path.isAbsolute(value)) {
								imageOptions.outputDir = path.join(OUTPUT_DIR, value);
								imageOptions.urlPath = value;
							} else {
								imageOptions.outputDir = path.join(OUTPUT_DIR, url, value);
								imageOptions.urlPath = path.join(url, value);
							}
							break;

						default:
							dataErrors.push(`Invalid argument: ${key} (${bkgUrl})`);
					}
				}

				// Simplify/set options
				if (imageOptions.widths?.length > 1) {
					const index = imageOptions.widths.findIndex((i) => i == "auto");
					if (typeof index == "number") {
						imageOptions.widths = [
							Math.min(...imageOptions.widths.toSpliced(index, 1, Infinity)),
						];
					}
				}
				imageOptions.formats = [imageOptions.formats?.at(0) || "webp"];

				try {
					let imgPath = await EleventyImage(imgSrc, imageOptions);
					content = replaceContext(
						content,
						bkgCtx,
						bkgUrl,
						imgPath[Object.keys(imgPath)[0]][0].url,
					);
				} catch (err) {
					dataErrors.push(`${err} (${bkgUrl})`);
					content = replaceContext(
						content,
						bkgCtx,
						bkgUrl,
						bkgUrl.replace(decodeURIComponent(params), ""),
					);
				}
			}

			if (dataErrors.length > 0) {
				let msg = `Problems while preprocessing url() functions in ${page.inputPath} `;
				let i = 1;
				dataErrors.forEach((error) => {
					msg += `\n${i++}. ${error} `;
				});
				eleventyConfig?.logger?.logWithOptions({
					message: msg,
					prefix: "[11ty/11ty-bkgimg]",
					color: "yellow",
				});
			}
		}

		return content;
	}

	eleventyConfig.addTransform("background-image", async function (content) {
		const path = this.page.outputPath || "";
		if (path.endsWith(".html") || path.endsWith(".css"))
			return transformBackgrounds(this.page, content);

		return content;
	});
}

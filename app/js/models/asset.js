import "cardinal-spline-js/curve.min.js";
import Spline from "cardinal-spline-js/curve_calc.min.js";

import MathUtils from "../lib/math.utils";
import ImageUtils from "../lib/image.utils";
import Video from "../models/video";

const esrever = require('esrever');
const opentype = require("opentype.js");
import opentypeEx from "../lib/opentype.extension";
Object.assign(opentype, opentypeEx);

export default class Asset {
	constructor(object, scene) {
		this.scene = scene;
		this.id = object.id;
		this.type = object.type;
		this.title = object.title || "";
		this.path = (object.path.indexOf("/") == 0 ? server_url : "") + object.path;
		this.thumb_path = (object.thumb_path.indexOf("/") == 0 ? server_url : "") + object.thumb_path;
		
		if (object.user_id && object.user_id != 1) this.user_id = object.user_id;

		if (object.data && typeof object.data == "string") object.data = JSON.parse(object.data);

		if (object.type == "image")
			this.paths = (object.data && object.data.paths) ||
				object.paths || [{ points: [], closed: false, active: true, stroke: 2, name: "Path 1" }];

		this.x = object.x || 0.5;
		this.y = object.y || 0.5;

		this.entryAnimation = object.entryAnimation || "draw";
		this.animationDuration = (object.data && object.data.animationDuration) || object.animationDuration;
		if (this.animationDuration == undefined) this.animationDuration = 3000;

		this.exitAnimation = object.exitAnimation || "none";
		this.exitAnimationDuration = object.exitAnimationDuration || 0;

		this.animationDelay = object.animationDelay || 0;

		this.zoom = object.zoom || 1;
		this.angle = object.angle || 0;
		this.flipped = object.flipped || false;
		this.color = object.color || null;
		this.erasing = object.erasing || false;

		this.invertForBlackboard = object.invertForBlackboard != null ? object.invertForBlackboard : true;

		if (object.type == "font") {
			this.text = object.text;
			this.fontSize = object.fontSize;
			this.align = object.align;
			this.direction = object.direction;
		}

		if (object.type == "image") {
			if (this.isDoodlyAsset()) {
				this.isGray = true;
			}
		}

		console.log(object, this);
	}

	getDataString() {
		return JSON.stringify({
			paths: this.paths,
			animationDuration: this.animationDuration
		});
	}

	preload(callback, cache) {
		if (this.type == "image") {
			let img = new Image();

			img.onload = () => {
				this.img = img;

				if (this.paths.length == 1 && this.paths[0].points.length == 0) this.generateDiagonalScratchPath();
				
				if(!this.isDoodlyAsset()) {
					this.isGray = ImageUtils.isGrayImage(img);
				}
				
				if (callback) callback();
			};

			img.src = this.path;
		}

		if (this.type == "font" && cache) {
			this.cache = cache;

			var index = cache.findIndex(item => item.path == this.path);
			if (index == -1) {
				cache.push({ path: this.path });
				opentype.load(this.path, (err, font) => {
					index = cache.findIndex(item => item.path == this.path);
					if (!err) {
						cache[index].font = font;
						if (callback) callback();
					} else cache.splice(index, 0);
				});
			} else if (callback) callback();
		}
	}

	createImageCache(canvasZoom, previewZoom, canvasStyle) {
		if (this.type == "image" && !this.img) return;

		let mode = this.getVideoMode();
		let shouldInvertColor = mode == Video.ModeChalk;
		let color;
		let backgroundColor;

		if(this.color) {
			color = this.color;
		} else {
			if(shouldInvertColor) color = '#ffffff';
			else color = '#000000';
		}
		
		if(canvasStyle == Video.StyleColorboard && mode == Video.ModeMarker) {
			backgroundColor = this.getVideoBackgroundColor();
		} else {
			backgroundColor = '#ffffff';
		}
		
		switch (this.type) {
			case "font":
				if (!this.cachedFont()) return;

				if (canvasZoom) {
					this.cachedImg = this.createTextImageCache(canvasZoom, canvasStyle);
					this.highlightImg = ImageUtils.imageWithOutline(this.cachedImg, 2);

					this.eraseImg = document.createElement("canvas");
					this.eraseImg.width = this.cachedImg.width;
					this.eraseImg.height = this.cachedImg.height;
					let ctx = this.eraseImg.getContext("2d");
					ctx.fillStyle = "#fff";
					ctx.fillRect(0, 0, this.eraseImg.width, this.eraseImg.height);
				}

				if (previewZoom) {
					this.previewCache = this.createTextImageCache(previewZoom, canvasStyle);

					this.previewEraseImg = document.createElement("canvas");
					this.previewEraseImg.width = this.previewCache.width;
					this.previewEraseImg.height = this.previewCache.height;
					let ctx = this.previewEraseImg.getContext("2d");
					ctx.fillStyle = "#fff";
					ctx.fillRect(0, 0, this.previewEraseImg.width, this.previewEraseImg.height);
				}
				break;

			default:
				if (canvasZoom) {
					this.cachedImg = !this.erasing && this.isGray
						? ImageUtils.colorImage(
								ImageUtils.resizeImage(this.img, this.zoom * canvasZoom),
								shouldInvertColor ? invertColor(color) : color,
								backgroundColor
						  )
						: ImageUtils.resizeImage(this.img, this.zoom * canvasZoom);

					this.highlightImg = ImageUtils.imageWithOutline(this.cachedImg, 2);
					this.eraseImg = this.highlightImg;
				}
				if (previewZoom) {
					this.previewCache = !this.erasing && this.isGray
						? ImageUtils.colorImage(
								ImageUtils.resizeImage(this.img, this.zoom * previewZoom),
								shouldInvertColor ? invertColor(color) : color,
								backgroundColor
						  )
						: ImageUtils.resizeImage(this.img, this.zoom * previewZoom);

					this.previewEraseImg = ImageUtils.imageWithOutline(this.previewCache, 2);
				}
		}

		this.canvasZoom = canvasZoom || this.canvasZoom;
		this.previewZoom = previewZoom || this.previewZoom;
		this.canvasStyle = canvasStyle || this.canvasStyle;
	}

	createTextImageCache(canvasZoom, canvasStyle) {
		let font = this.cachedFont();
		let lines = this.text.split("\n");
		let assetM = this.measure(null, canvasZoom);

		let fontSize = this.fontSize * this.zoom * canvasZoom;

		let canvas = document.createElement("canvas");
		canvas.width = assetM.width;
		canvas.height = assetM.height;

		let ctx = canvas.getContext("2d");

		var x = 0,
			y = 0;
		let horizontalPadding = 3 * this.zoom * canvasZoom;

		for (let i = 0; i < lines.length; i++) {
			
			let text = this.direction == 'rtl' ? esrever.reverse(lines[i]) : lines[i];

			let lineM = opentype.measureText(font, text, fontSize);
			y = lineM.fontBoundingBoxAscent;
			switch (this.align) {
				case "center":
					x = assetM.width / 2 - lineM.width / 2;
					break;
				case "right":
					x = assetM.width - lineM.width - horizontalPadding;
					break;
				default:
					x = horizontalPadding; // small left padding for serif oblique fonts
			}
			let path = font.getPath(text, x, y + i * assetM.lineHeight, fontSize);

			if (this.color) {
				let shouldInvertColor = this.getVideoMode() == Video.ModeChalk;
				path.fill = shouldInvertColor ? invertColor(this.color) : this.color;
			}

			path.draw(ctx);
		}

		return canvas;
	}

	draw(canvas, canvasZoom, isHovered, isPreview, canvasStyle, isExit) {
		if (!canvas || (this.type == "image" && !this.img) || (this.type == "font" && !this.cachedFont())) return;

		let zoom = isPreview ? 0 : canvasZoom;
		let previewZoom = isPreview ? canvasZoom : 0;
		let style = canvasStyle || this.canvasStyle;

		if ((zoom && !this.cachedImg) || (previewZoom && !this.previewCache))
			this.createImageCache(zoom, previewZoom, style);

		let ctx = canvas.getContext("2d");
		let assetM = this.measure(canvas, canvasZoom);

		var img = this.cachedImg;
		if (isHovered) {
			img = this.highlightImg;
			assetM.left -= 2;
			assetM.top -= 2;
			assetM.width += 4;
			assetM.height += 4;
		}
		if (isPreview) img = this.previewCache;

		ctx.save();
		if (this.angle) {
			ctx.translate(assetM.x, assetM.y);
			assetM.left = -assetM.width / 2;
			assetM.top = -assetM.height / 2;
			ctx.rotate((this.angle * Math.PI) / 180);
		}
		if (this.flipped) {
			ctx.scale(-1, 1);
			assetM.left *= -1;
			assetM.width *= -1;
		}

		ctx.drawImage(img, assetM.left, assetM.top, assetM.width, assetM.height);
		ctx.restore();
	}

	drawPartial(canvas, canvasZoom, progress, isPreview, canvasStyle) {
		if (!canvas || (this.type == "image" && !this.img) || (this.type == "font" && !this.cachedFont())) return;

		let zoom = isPreview ? 0 : canvasZoom;
		let previewZoom = isPreview ? canvasZoom : 0;
		let style = canvasStyle || this.canvasStyle;

		if ((zoom && !this.cachedImg) || (previewZoom && !this.previewCache))
			this.createImageCache(zoom, previewZoom, style);

		var point;
		switch (this.type) {
			case "font":
				point = this.drawPartialText(canvas, canvasZoom, progress, style);
				break;
			default:
				point = this.drawPartialImage(canvas, canvasZoom, progress, isPreview);
		}

		if (point) {
			var assetM = this.measure(canvas, canvasZoom);

			if (this.flipped) point.x = assetM.width - point.x;

			var p = MathUtils.rotatedRectanglePoint(
				assetM.x,
				assetM.y,
				assetM.width,
				assetM.height,
				this.angle,
				point.x + assetM.left,
				point.y + assetM.top
			);
			let assetPenAngle = (Math.atan2(assetM.height / 2 - p.y, assetM.width - p.x) * 180.0) / Math.PI;
			let canvasPenAngle =
				(Math.atan2(canvas.height / 2 - (assetM.y + p.y), canvas.width - (assetM.x + p.x)) * 180.0) / Math.PI;

			// wherever drawPartial is called, the handInfo should be used to draw the hand after fully processing the frame
			return {
				x: p.x + assetM.left,
				y: p.y + assetM.top,
				angle: {
					asset: assetPenAngle,
					canvas: canvasPenAngle
				}
			};
		}
	}

	// simply erases the asset from the scene completely
	drawExit(canvas, canvasZoom, isPreview, canvasStyle) {
		switch (this.exitAnimation) {
			case "erase":
				this.drawErasedAsset(canvas, canvasZoom, isPreview, canvasStyle);
				break;
			default:
				break;
		}
	}

	// draw the asset exit animation
	drawExitPartial(canvas, canvasZoom, progress, isPreview, canvasStyle) {
		var point;
		switch (this.exitAnimation) {
			case "erase":
				point = this.drawErasedAssetPartial(canvas, canvasZoom, progress, isPreview, canvasStyle);
			default:
				break;
		}

		if (point) {
			var assetM = this.measure(canvas, canvasZoom);

			if (this.flipped) point.x = assetM.width - point.x;

			var p = MathUtils.rotatedRectanglePoint(
				assetM.x,
				assetM.y,
				assetM.width,
				assetM.height,
				this.angle,
				point.x + assetM.left,
				point.y + assetM.top
			);
			return {
				x: p.x + assetM.left,
				y: p.y + assetM.top
			};
		}
	}

	drawPartialImage(canvas, canvasZoom, progress, isPreview) {
		var tempCanvas = document.createElement("canvas");

		var img = this.cachedImg;
		if (isPreview) img = this.previewCache;

		tempCanvas.width = img.width;
		tempCanvas.height = img.height;

		var tempCtx = tempCanvas.getContext("2d");
		tempCtx.globalCompositeOperation = "source-over";

		// if there are no defined paths, add a scratching pattern path
		var paths =
			this.paths.length == 1 && this.paths[0].points.length == 0
				? this.diagonalScratchPath
				: this.paths.filter(path => path.points.length >= 2);

		var points = [],
			pathLenghts = [];

		paths.forEach(path => {
			if (path.points.length >= 2) {
				var pathPoints = Spline.getCurvePoints(
					[]
						.concat(...path.points.map(point => [point.x, point.y]))
						.map((x, i) => x * (i % 2 == 0 ? img.width : img.height)),
					0.5,
					10,
					path.closed
				);
				points = points.concat([...pathPoints]); // convert typed array into array using ... operator
				pathLenghts.push(pathPoints.length);
			}
		});

		var drawablePointsCount = Math.min(Math.ceil(points.length * progress), points.length);
		if (drawablePointsCount < 2) {
			return;
		}
		if (drawablePointsCount % 2 != 0) {
			drawablePointsCount--;
		}
		var points = points.slice(0, drawablePointsCount);
		var currentPath = 0,
			nextPathStart = 0;
		var i;
		for (i = 0; i < points.length - 2; i += 2) {
			if (i == nextPathStart) {
				if (i != 0) {
					tempCtx.stroke();
				}
				tempCtx.beginPath();
				tempCtx.strokeStyle = "red";
				tempCtx.lineWidth = paths[currentPath].stroke * canvasZoom * this.zoom;
				tempCtx.moveTo(points[i], points[i + 1]);
				nextPathStart += pathLenghts[currentPath];
				currentPath++;
			} else {
				tempCtx.lineTo(points[i], points[i + 1]);
			}
		}
		tempCtx.stroke();
		tempCtx.globalCompositeOperation = "source-in";
		tempCtx.drawImage(img, 0, 0, img.width, img.height);

		this.drawPartialCanvas(canvas, canvasZoom, tempCanvas);

		if (i > 0) {
			var pointX = points[i - 2],
				pointY = points[i - 1];

			return {
				x: pointX,
				y: pointY
			};
		}
	}

	drawPartialText(canvas, canvasZoom, progress, canvasStyle) {
		var color = "black";
		if (this.color) {
			let shouldInvertColor = this.getVideoMode() == Video.ModeChalk;
			color = shouldInvertColor ? invertColor(this.color) : this.color;
		}

		var ctx = canvas.getContext("2d");
		var font = this.cachedFont(this.path);

		var lines = this.text.split("\n");
		var totalLengh = lines.map(line => line.length).reduce((a, b) => a + b, 0);

		var assetM = this.measure(canvas, canvasZoom);
		var fontSize = this.fontSize * this.zoom * canvasZoom;

		var tempCanvas = document.createElement("canvas");
		tempCanvas.width = assetM.width;
		tempCanvas.height = assetM.height;
		var tempCtx = tempCanvas.getContext("2d");

		var maskCanvas = document.createElement("canvas");
		maskCanvas.width = assetM.width;
		maskCanvas.height = assetM.height;
		var maskCtx = maskCanvas.getContext("2d");

		var accountedFor = 0;
		for (var i = 0; i < lines.length; i++) {
			let text = this.direction == 'rtl' ? esrever.reverse(lines[i]) : lines[i];

			var x;
			const horizontalPadding = 3 * this.zoom * canvasZoom;
			var lineM = opentype.measureText(font, lines[i], this.fontSize * this.zoom * canvasZoom);
			var y = lineM.fontBoundingBoxAscent;
			switch (this.align) {
				case "center":
					x = assetM.width / 2 - lineM.width / 2;
					break;
				case "right":
					x = assetM.width - lineM.width - horizontalPadding;
					break;
				default:
					x = horizontalPadding;
			}

			tempCtx.globalCompositeOperation = "source-over";
			if (accountedFor + text.length < Math.ceil(progress * totalLengh)) {
				// draw whole line
				accountedFor += text.length;

				let fontPath = font.getPath(text, x, y + i * assetM.lineHeight, fontSize);
				fontPath.fill = color;
				fontPath.draw(tempCtx);
			} else {
				// draw partial line
				var lineProgress = (progress * totalLengh - accountedFor) / text.length;
				accountedFor += Math.ceil(text.length * lineProgress);
				if (lineProgress < 0) break;

				var path = font.getPath(text, x, y + i * assetM.lineHeight, fontSize);

				if(this.direction == 'rtl') {
					path.commands = path.commands.slice(-Math.ceil(path.commands.length * lineProgress));
				} else {
					path.commands = path.commands.slice(0, Math.ceil(path.commands.length * lineProgress));
				}

				if (path.commands.length < 2) break;

				var lastCommand = this.direction == 'rtl' ? path.commands[0] : path.commands[path.commands.length - 1],
					prevCommand = this.direction == 'rtl' ? path.commands[1] : path.commands[path.commands.length - 2];

				var lastPoint = lastCommand.x ? lastCommand : prevCommand.x ? prevCommand : null;

				if (lastPoint) {
					path.draw(tempCtx);

					let fontPath = font.getPath(text, x, y + i * assetM.lineHeight, fontSize);
					fontPath.fill = color;
					fontPath.draw(maskCtx);
				}

				if (lineProgress < 1) break;
			}
		}

		maskCtx.fillStyle = color;
		maskCtx.fillRect(0, 0, tempCanvas.width, i * assetM.lineHeight);

		tempCtx.globalCompositeOperation = "source-in";
		tempCtx.drawImage(maskCanvas, 0, 0, maskCanvas.width, maskCanvas.height);

		this.drawPartialCanvas(canvas, canvasZoom, tempCanvas);

		if (lastPoint)
			return {
				x: lastPoint.x,
				y: lastPoint.y
			};
	}

	drawPartialCanvas(canvas, canvasZoom, tempCanvas) {
		var ctx = canvas.getContext("2d");
		var assetM = this.measure(canvas, canvasZoom);

		ctx.save();
		if (this.angle) {
			ctx.translate(assetM.x, assetM.y);
			assetM.left = -assetM.width / 2;
			assetM.top = -assetM.height / 2;
			ctx.rotate((this.angle * Math.PI) / 180);
		}
		if (this.flipped) {
			ctx.scale(-1, 1);
			assetM.left *= -1;
			assetM.width *= -1;
		}
		ctx.drawImage(tempCanvas, assetM.left, assetM.top, assetM.width, assetM.height);
		ctx.restore();
	}

	measure(canvas, canvasZoom) {
		var measurements = canvas
			? {
					x: this.x * canvas.width,
					y: this.y * canvas.height
			  }
			: {};

		switch (this.type) {
			case "font":
				var font = this.cachedFont();
				var lines = this.text.split("\n");
				var fontLineHeight =
					(font.ascender / font.unitsPerEm) * this.fontSize - (font.descender / font.unitsPerEm) * this.fontSize;
				var maxWidth = Math.max(
					...lines.map(text => {
						var textMeasurements = opentype.measureText(font, text, this.fontSize * this.zoom * canvasZoom);
						return textMeasurements.width + 6 * this.zoom * canvasZoom; // small lateral padding for serif oblique fonts
					})
				);

				measurements.lineHeight = Math.ceil(fontLineHeight * this.zoom * canvasZoom);
				measurements.width = Math.round(maxWidth);
				measurements.height = Math.round(measurements.lineHeight * lines.length);
				break;

			default:
				measurements.width = Math.round(this.img.width * this.zoom * canvasZoom);
				measurements.height = Math.round(this.img.height * this.zoom * canvasZoom);
		}

		measurements.left = Math.round(measurements.x - measurements.width / 2);
		measurements.top = Math.round(measurements.y - measurements.height / 2);

		return measurements;
	}

	cachedFont() {
		if (!this.cache || this.cache.length == 0) return null;
		let cachedFont = this.cache.find(item => item.path == this.path);
		return cachedFont && cachedFont.font;
	}

	updatePaths(paths) {
		this.paths = paths;
		if (this.paths.length <= 1 && this.paths[0].points.length == 0) this.generateDiagonalScratchPath();
	}

	generateDiagonalScratchPath() {
		if (!this.diagonalScratchPath) {
			var start = Date.now();
			var iCanvas = document.createElement("canvas");

			let img = this.img || this.previewCache;

			iCanvas.width = img.width;
			iCanvas.height = img.height;
			var iCtx = iCanvas.getContext("2d");
			iCtx.drawImage(img, 0, 0);
			var imgData = iCtx.getImageData(0, 0, iCanvas.width, iCanvas.height).data;

			const hashesCount = 25;

			// top left part
			var points = [];
			var x = 0,
				y = 0,
				i = 0;
			while (x < hashesCount || y < hashesCount) {
				var found = false;
				if (i % 2 == 0) {
					x += 1;
					var j = 0,
						xi = x,
						yi = 0;
					while (xi > 0 && yi < y && !found) {
						for (
							var xxi = Math.round((xi / hashesCount) * iCanvas.width);
							xxi > Math.round(((xi - 1) / hashesCount) * iCanvas.width);
							xxi--
						) {
							for (
								var yyi = Math.round((yi / hashesCount) * iCanvas.height);
								yyi < Math.round(((yi + 1) / hashesCount) * iCanvas.height);
								yyi++
							)
								if (imgData[(iCanvas.width * yyi + xxi) * 4 + 3] > 0) {
									points.push({
										x: MathUtils.round(xxi / iCanvas.width, 2),
										y: MathUtils.round(yyi / iCanvas.height, 2)
									});
									found = true;
									break;
								}
							if (found) break;
						}

						if (j % 2 == 0) xi -= 1;
						else yi += 1;
						j++;
					}
				} else {
					y += 1;
					var xi = 0;
					yi = y;
					while (xi <= x && yi > 0 && !found) {
						for (
							var xxi = Math.round((xi / hashesCount) * iCanvas.width);
							xxi < Math.round(((xi + 1) / hashesCount) * iCanvas.width);
							xxi++
						) {
							for (
								var yyi = Math.round((yi / hashesCount) * iCanvas.height);
								yyi > Math.round(((yi - 1) / hashesCount) * iCanvas.height);
								yyi--
							) {
								if (imgData[(iCanvas.width * yyi + xxi) * 4 + 3] > 0) {
									points.push({
										x: MathUtils.round(xxi / iCanvas.width, 2),
										y: MathUtils.round(yyi / iCanvas.height, 2)
									});
									found = true;
									break;
								}
							}
							if (found) break;
						}

						xi += 1;
						yi -= 1;
					}
				}

				i++;
			}

			// bottom right half
			var x = 0,
				y = 0,
				i = 1;
			while (x < hashesCount || y < hashesCount) {
				var found = false;
				if (i % 2 == 0) {
					x += 1;
					var xi = x,
						yi = hashesCount;
					while (xi < hashesCount && yi > y && !found) {
						for (
							var xxi = Math.round((xi / hashesCount) * iCanvas.width);
							xxi < Math.round(((xi + 1) / hashesCount) * iCanvas.width);
							xxi++
						) {
							for (
								var yyi = Math.round((yi / hashesCount) * iCanvas.height);
								yyi > Math.round(((yi - 1) / hashesCount) * iCanvas.height);
								yyi--
							)
								if (imgData[(iCanvas.width * yyi + xxi) * 4 + 3] > 0) {
									points.push({
										x: MathUtils.round(xxi / iCanvas.width, 2),
										y: MathUtils.round(yyi / iCanvas.height, 2)
									});
									found = true;
									break;
								}
							if (found) break;
						}
						xi += 1;
						yi -= 1;
					}
				} else {
					y += 1;
					var xi = hashesCount;
					(yi = y), (j = 0);
					while (xi > 0 && yi < hashesCount && !found) {
						for (
							var xxi = Math.round((xi / hashesCount) * iCanvas.width);
							xxi > Math.round(((xi - 1) / hashesCount) * iCanvas.width);
							xxi--
						) {
							for (
								var yyi = Math.round((yi / hashesCount) * iCanvas.height);
								yyi < Math.round(((yi + 1) / hashesCount) * iCanvas.height);
								yyi++
							)
								if (imgData[(iCanvas.width * yyi + xxi) * 4 + 3] > 0) {
									points.push({
										x: MathUtils.round(xxi / iCanvas.width, 2),
										y: MathUtils.round(yyi / iCanvas.height, 2)
									});
									found = true;
									break;
								}
							if (found) break;
						}
						if (j % 2 == 0) xi -= 1;
						else yi += 1;
						j++;
					}
				}
				i++;
			}

			this.diagonalScratchPath = [
				{
					// points: [ // basic version that doesn't care about the object
					//   {x: 0, y: 0}, {x: 0.1, y: 0}, {x: 0, y: 0.1}, {x: 0.2, y: 0}, {x: 0, y: 0.2}, {x: 0.3, y: 0}, {x: 0, y: 0.3},
					//   {x: 0.4, y: 0}, {x: 0, y: 0.4}, {x: 0.5, y: 0}, {x: 0, y: 0.5}, {x: 0.6, y: 0}, {x: 0, y: 0.6}, {x: 0.7, y: 0},
					//   {x: 0, y: 0.7}, {x: 0.8, y: 0}, {x: 0, y: 0.8}, {x: 0.9, y: 0}, {x: 0, y: 0.9}, {x: 1, y: 0}, {x: 0, y: 1},
					//   {x: 1, y: 0.1}, {x: 0.1, y: 1}, {x: 1, y: 0.2}, {x: 0.2, y: 1}, {x: 1, y: 0.3}, {x: 0.3, y: 1}, {x: 1, y: 0.4},
					//   {x: 0.4, y: 1}, {x: 1, y: 0.5}, {x: 0.5, y: 1}, {x: 1, y: 0.6}, {x: 0.6, y: 1}, {x: 1, y: 0.7}, {x: 0.7, y: 1},
					//   {x: 1, y: 0.8}, {x: 0.8, y: 1}, {x: 1, y: 0.9}, {x: 0.9, y: 1}, {x: 1, y: 1}
					// ],
					points: points,
					closed: false,
					stroke: Math.max(img.width, img.height) / 11
				}
			];
		}
	}

	// Exit Animations
	drawErasedAsset(canvas, canvasZoom, isPreview, canvasStyle) {
		if (!canvas || (this.type == "image" && !this.img) || (this.type == "font" && !this.cachedFont())) return;

		let zoom = isPreview ? 0 : canvasZoom;
		let previewZoom = isPreview ? canvasZoom : 0;
		let style = canvasStyle || this.canvasStyle;

		// if ((zoom && !this.cachedImg) || (previewZoom && !this.previewCache))
		//   this.createImageCache(zoom, previewZoom, style);

		let ctx = canvas.getContext("2d");
		let assetM = this.measure(canvas, canvasZoom);

		var img = this.eraseImg;
		if (isPreview) img = this.previewEraseImg;

		assetM.left -= 2;
		assetM.top -= 2;
		assetM.width += 4;
		assetM.height += 4;

		ctx.save();
		if (this.angle) {
			ctx.translate(assetM.x, assetM.y);
			assetM.left = -assetM.width / 2;
			assetM.top = -assetM.height / 2;
			ctx.rotate((this.angle * Math.PI) / 180);
		}
		if (this.flipped) {
			ctx.scale(-1, 1);
			assetM.left *= -1;
			assetM.width *= -1;
		}

		ctx.globalCompositeOperation = "destination-out";
		ctx.drawImage(img, assetM.left, assetM.top, assetM.width, assetM.height);
		ctx.restore();
	}
	drawErasedAssetPartial(canvas, canvasZoom, progress, isPreview, canvasStyle) {
		var tempCanvas = document.createElement("canvas");

		var img = this.eraseImg;
		if (isPreview) img = this.previewEraseImg;

		tempCanvas.width = img.width;
		tempCanvas.height = img.height;

		var tempCtx = tempCanvas.getContext("2d");
		tempCtx.globalCompositeOperation = "source-over";
		tempCtx.drawImage(img, 0, 0, img.width, img.height);

		if (!this.diagonalScratchPath) this.generateDiagonalScratchPath();
		var paths = this.diagonalScratchPath;

		var points = [],
			pathLenghts = [];
		paths.forEach(path => {
			if (path.points.length >= 2) {
				var pathPoints = Spline.getCurvePoints(
					[]
						.concat(...path.points.map(point => [point.x, point.y]))
						.map((x, i) => x * (i % 2 == 0 ? img.width : img.height)),
					0.5,
					10,
					path.closed
				);
				points = points.concat([...pathPoints]); // convert typed array into array using ... operator
				pathLenghts.push(pathPoints.length);
			}
		});

		tempCtx.globalCompositeOperation = "source-in";

		var drawablePointsCount = Math.min(Math.ceil(points.length * progress), points.length);
		if (drawablePointsCount < 2) {
			return;
		}
		if (drawablePointsCount % 2 != 0) {
			drawablePointsCount--;
		}
		var points = points.slice(0, drawablePointsCount);
		var currentPath = 0,
			nextPathStart = 0;
		var i;
		for (i = 0; i < points.length - 2; i += 2) {
			if (i == nextPathStart) {
				if (i != 0) {
					tempCtx.stroke();
				}
				tempCtx.beginPath();
				tempCtx.strokeStyle = "#ffffff";
				tempCtx.lineWidth = paths[currentPath].stroke * canvasZoom * this.zoom;
				tempCtx.moveTo(points[i], points[i + 1]);
				nextPathStart += pathLenghts[currentPath];
				currentPath++;
			} else {
				tempCtx.lineTo(points[i], points[i + 1]);
			}
		}
		tempCtx.stroke();

		this.drawPartialCanvas(canvas, canvasZoom * 1.02, tempCanvas);

		var assetM = this.measure(canvas, canvasZoom);

		if (i > 0) {
			var pointX = points[i - 2],
				pointY = points[i - 1];

			return {
				x: pointX,
				y: pointY
			};
		}
	}

	getVideoBackgroundColor() {
		return (this.scene && this.scene.getVideoBackgroundColor()) || Video.BackgroundDefaultColor;
	}

	getVideoMode() {
		return (this.scene && this.scene.getVideoMode()) || Video.ModeMarker;
	}

	isDoodlyAsset() {
		return !this.user_id || this.user_id == 1;
	}
}

function invertColor(hexTripletColor) {
	var color = hexTripletColor;
	color = color.substring(1); // remove #
	color = parseInt(color, 16); // convert to integer
	color = 0xffffff ^ color; // invert three bytes
	color = color.toString(16); // convert to hex
	color = ("000000" + color).slice(-6); // pad with leading zeros
	color = "#" + color; // prepend #
	return color;
}

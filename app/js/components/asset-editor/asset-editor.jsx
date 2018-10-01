import React from "react";
import PropTypes from "prop-types";
import $ from "jquery";
import _ from "lodash";

import Asset from "../../models/asset";
import Hand from "../../hands.js";

import ContentEditable from "../common/content-editable.jsx";
import Modal from "../common/modal.jsx";

import AssetEditorStaffActions from "./staff-actions.jsx";
import AssetEditorUserActions from "./user-actions.jsx";
import AssetDetails from "../common/asset-details.jsx";

require("cardinal-spline-js/curve.min.js");

var pointSize = 3;
var emptyPath = { points: [], closed: false, active: true, stroke: 2, name: "Path 1" };

class AssetEditor extends React.Component {
	state = {
		loading: true,
		initialCanvasWidth: 400,
		initialCanvasHeight: 400,
		canvasAlign: "absolute-center",
		canvasCursor: "arrow",
		mode: "add_point",
		animationDuration: 5000,
		target: null,
		published: false,
		loadedPaths: null,
		zoom: 1,
		paths: [_.cloneDeep(emptyPath)],
		history: []
	};

	componentDidMount() {
		this.load();
		Hand.useSet(0);
		document.onkeydown = this.handleKeyDown;
		document.onkeyup = this.handleKeyUp;
	}

	componentWillUnmount() {
		document.onkeydown = null;
		document.onkeyup = null;
		if (this.currentAnimation) {
			cancelAnimationFrame(this.currentAnimation);
		}
		if (this.startingAnimation) {
			clearTimeout(this.startingAnimation);
			this.startingAnimation = null;
		}
	}

	componentDidUpdate(prevProps, prevState) {
		if (this.props != prevProps) {
			this.load();
		}
	}

	handleKeyDown = e => {
		if (e.keyCode == 90 && (e.metaKey || e.ctrlKey)) {
			e.preventDefault();
			this.handleUndo();
		}
		this.setCanvasCursor(e);
	};

	handleKeyUp = e => {
		this.setCanvasCursor(e);
	};

	handleAction = action => {
		switch (action) {
			case "save":
				this.save();
				break;
			case "publish":
				this.publish();
				break;
			case "unpublish":
				this.unpublish();
				break;
			case "settings":
				this.showSettings();
				break;
			case "save_details":
				this.saveAssetDetails();
				break;
			case "delete":
				this.delete();
				break;
			case "return":
				this.props.videoActionListener("finish_editing_asset");
				break;
			case "save&return":
				this.save(saved_asset => {
					this.props.videoActionListener({
						action: "finish_editing_asset",
						data: {
							asset: saved_asset
						}
					});
				});
				break;
			default:
		}
	};

	render() {
		var styles = {
			red: {
				color: "#ff0000"
			}
		};
		return (
			<div className="asset-editor fill flex stretch">
				<div ref="canvasHolder" className="canvas-holder fill">
					<canvas
						className={"main-canvas " + this.state.canvasAlign + " " + this.state.canvasCursor}
						ref="mainCanvas"
						width={this.state.initialCanvasWidth * this.state.zoom}
						height={this.state.initialCanvasHeight * this.state.zoom}
						onClick={this.handleCanvasClick}
						onMouseDown={this.handleCanvasMouseDown}
						onMouseUp={this.handleCanvasMouseUp}
						onMouseMove={this.handleCanvasMouseMove}
					/>
					<i className={this.state.loading ? "spinner fa fa-3x fa-refresh fa-spin" : "hidden"} />
					<div className="toast" ref="toast" />
				</div>
				<div className="right-sidebar flex column">
					<h3>Live Preview</h3>
					<div className="group text-center no-shrink">
						<canvas
							className="preview-canvas"
							ref="previewCanvas"
							width={this.state.previewZoom ? this.state.initialCanvasWidth * this.state.previewZoom : 260}
							height={this.state.previewZoom ? this.state.initialCanvasHeight * this.state.previewZoom : 140}
							onClick={this.handlePreviewClick}
						/>
						<Modal ref="previewModal" onCancel={this.handleDismissFullPreview}>
							<canvas
								className="preview-canvas-full"
								ref="previewCanvasFull"
								width={this.state.initialCanvasWidth * this.state.fullPreviewZoom}
								height={this.state.initialCanvasHeight * this.state.fullPreviewZoom}
							/>
						</Modal>
					</div>
					<h3>Actions</h3>
					{this.props.video ? (
						<AssetEditorUserActions {...this.props} assetActionListener={this.handleAction} />
					) : (
						<AssetEditorStaffActions
							{...this.props}
							published={this.state.published}
							assetActionListener={this.handleAction}
						/>
					)}
					<h3>Tools</h3>
					<div className="group tools no-shrink">
						<button
							className={"btn" + (this.state.mode == "arrow" ? " focus" : "")}
							onClick={this.setTool.bind(this, "arrow")}>
							<i className="fa fa-mouse-pointer" />
						</button>
						<button
							className={"btn" + (this.state.mode == "add_point" ? " focus" : "")}
							onClick={this.setTool.bind(this, "add_point")}>
							<i className="fa fa-plus" />
						</button>
						<button
							className={"btn" + (this.state.mode == "remove_point" ? " focus" : "")}
							onClick={this.setTool.bind(this, "remove_point")}>
							<i className="fa fa-trash" style={styles.red} />
						</button>
						<hr />
						<label>Path Size:</label>
						<input
							type="range"
							ref="pathSize"
							min="1"
							max="30"
							defaultValue={2}
							onChange={this.handlePathSizeChange}
							onMouseDown={this.beginPathSizeChange}
							onMouseUp={this.endPathSizeChange}
						/>
						<hr />
						<label>Zoom:</label>
						<button className="btn" onClick={this.handleZoomIn}>
							<i className="fa fa-search-plus" />
						</button>
						<button className="btn" onClick={this.handleZoomOut}>
							<i className="fa fa-search-minus" />
						</button>
						<hr />
						<label>Animation Duration:</label>
						<input
							type="range"
							ref="animationDuration"
							min="1000"
							max="30000"
							defaultValue={5000}
							onInput={this.handleAnimationDurationValue}
							onMouseUp={this.handleAnimationDurationChange}
						/>
						&nbsp;&nbsp;
						<span id="animationDurationLabel">
							{((this.state.asset && Math.floor(this.state.asset.animationDuration / 1000)) || 5) + "s"}
						</span>
						<hr />
					</div>
					<h3>Reveal Paths</h3>
					<div className="group paths fill flex">
						<button className="btn new-path" onClick={this.handleAddPath}>
							<i className="fa fa-plus" /> New path
						</button>
						{this.state.asset && (
							<div className="path-list fill">
								{this.state.asset.paths.map(
									function(path, i) {
										return (
											<div className="row" key={i}>
												<ContentEditable
													id={i}
													className={
														"path" + (path.active ? " active" : "") + (this.draggedPath == path ? " hidden" : "")
													}
													html={path.name}
													draggable="true"
													onDragStart={this.handlePathDragStart}
													onDragEnd={this.handlePathDragEnd}
													onDragOver={this.handlePathDragOver}
													onDrop={this.handlePathDrop}
													onSelect={this.handleSelectPath.bind(this, path)}
													onChange={this.handlePathNameChange.bind(this, path)}
												/>
												<button
													className="btn clear"
													title="Delete path"
													onClick={this.handleDeletePath.bind(this, path)}>
													<i className="fa fa-trash-o" style={styles.red} />
												</button>
											</div>
										);
									}.bind(this)
								)}
								<div
									className="path clear"
									draggable={false}
									key={this.state.asset.paths.length}
									id={this.state.asset.paths.length}
									onDragOver={this.handlePathDragOver}
									onDrop={this.handlePathDrop}
								/>
							</div>
						)}
					</div>
				</div>
				<Modal ref="changeTitle">
					<label htmlFor="title">Change asset title:</label>
					<input type="text" ref="assetTitle" size="25" />
					<br />&nbsp;
					<div className="text-right">
						<button className="btn success" onClick={this.updateAssetTitle}>
							Done
						</button>
					</div>
				</Modal>
				<AssetDetails ref="assetDetails" assetActionListener={this.handleAction} {...this.props} />
			</div>
		);
	}

	/* --- ASSET FUNCTIONS -- */
	load = () => {
		cancelAnimationFrame(this.currentAnimation);

		// clear canvas
		var canvas = this.refs.mainCanvas;
		var ctx = canvas.getContext("2d");
		ctx.clearRect(0, 0, canvas.width, canvas.height);
		this.setState({ loading: true });

		$.get(server_url + "/assets/" + this.props.item.id)
			.done(item => {
				var asset = new Asset(item);
				this.setState({
					asset: asset,
					mode: this.getActivepath(asset).points.length ? "arrow" : "add_point",
					target: null,
					published: item.status == "published",
					loadedPaths: JSON.stringify(asset.paths),
					history: []
				});

				this.refs.animationDuration.value = asset.animationDuration;
				this.requestCanvasUpdate();
				$(".canvas-holder").addClass("space-around center");
			})
			.fail((request, textStatus, error) => this.props.handleAjaxFail(request, this.load));
	};

	save = callback => {
		$(".toast")
			.html("Saving...")
			.fadeIn(500);
		$.ajax({
			url: server_url + "/assets/" + this.props.item.id,
			type: "PUT",
			data: { data: this.state.asset.getDataString() }
		})
			.done(data => {
				this.setState({
					loadedPaths: JSON.stringify(this.state.asset.paths),
					requireSave: false
				});
				this.updateStatus();
				$(".toast").html("Saved successfully");
				setTimeout(() => {
					$(".toast").fadeOut(500);
				}, 2000);
				if (callback) callback(this.state.asset);
			})
			.fail((request, statusText, error) => {
				if (statusText == "timeout") {
					this.save();
				} else this.props.handleAjaxFail(request, this.save);
			});
	};

	publish = () => {
		$(".toast")
			.html("Publishing...")
			.fadeIn(500);
		$.ajax({
			url: server_url + "/assets/" + this.props.item.id,
			type: "PUT",
			data: { status: "published" }
		})
			.done(data => {
				this.setState({ published: true });
				this.props.item.status = "published";
				if (this.props.item.onStatusChange) {
					this.props.item.onStatusChange();
				}
			})
			.fail((request, textStatus, error) => this.props.handleAjaxFail(request, this.publish))
			.always(() => {
				$(".toast").fadeOut();
			});
	};

	unpublish = () => {
		$(".toast")
			.html("Unpublishing...")
			.fadeIn(500);
		$.ajax({
			url: server_url + "/assets/" + this.props.item.id,
			type: "PUT",
			data: { status: "none" }
		})
			.done(data => {
				this.setState({ published: false });
				this.props.item.status = "none";
				if (this.props.item.onStatusChange) {
					this.props.item.onStatusChange();
				}
			})
			.fail((request, textStatus, error) => this.props.handleAjaxFail(request, this.unpublish))
			.always(() => {
				$(".toast").fadeOut();
			});
	};

	delete = callback => {
		confirm(
			"Are you sure you want to delete this asset? This action is not reversible.\nThe asset will no longer be available outside the scenes that already use it."
		).then(() => {
			$(".toast")
				.html("Deleting asset...")
				.fadeIn(500);
			$.ajax({
				url: server_url + "/assets/" + this.props.item.id,
				type: "PUT",
				data: { status: "inactive" }
			})
				.done(data => {
					this.setState({ published: false });
					this.props.item.status = "inactive";
					if (callback) {
						callback();
					} else if (this.props.item.onStatusChange) {
						this.props.item.onStatusChange();
					}
				})
				.fail((request, textStatus, error) => this.props.handleAjaxFail(request, this.delete))
				.always(() => {
					$(".toast").fadeOut();
				});
		});
	};

	updateStatus = () => {
		console.log(this.state.loadedPaths, JSON.stringify(this.state.asset.paths));
		this.props.item.requiresSave = this.state.loadedPaths != JSON.stringify(this.state.asset.paths);
		this.forceUpdate();
	};

	showSettings = () => {
		this.refs.assetDetails.show();
	};

	saveAssetDetails = () => {
		$(".toast")
			.html("Saving asset details...")
			.fadeIn(500);
		$.ajax({
			url: server_url + "/assets/" + this.props.item.id,
			type: "PUT",
			data: {
				title: this.props.item.title,
				categ_id: this.props.item.categ_id,
				is_pro: this.props.item.is_pro ? 1 : 0,
				is_club: this.props.item.is_club ? 1 : 0,
				club_month: this.props.item.club_month,
				is_gold: this.props.item.is_gold ? 1 : 0,
				is_platinum: this.props.item.is_platinum ? 1 : 0,
				is_enterprise: this.props.item.is_enterprise ? 1 : 0
			}
		})
			.fail((request, textStatus, error) => this.props.handleAjaxFail(request, this.updateAssetTitle))
			.always(() => {
				$(".toast").fadeOut();
			});

		if (this.props.item.onStatusChange) this.props.item.onStatusChange();
	};

	/* --- CANVAS --- */
	requestCanvasUpdate = () => {
		if (this.updatingCanvas) {
			cancelAnimationFrame(this.updatingCanvas);
		}
		this.updatingCanvas = requestAnimationFrame(this.updateMainCanvas);
	};

	updateMainCanvas = () => {
		if (!this.state.asset.img) {
			this.state.asset.preload(() => {
				var img = this.state.asset.img;
				var mainZoom = Math.min(
					1,
					Math.min(($(".canvas-holder").width() - 40) / img.width, ($(".canvas-holder").height() - 40) / img.height)
				);
				var previewZoom = Math.min(1, Math.min(260 / img.width, 200 / img.height));
				var fullPreviewZoom = Math.min(
					1,
					Math.min((document.body.clientWidth - 100) / img.width, (document.body.clientHeight - 100) / img.height)
				);

				this.setState({
					loading: false,
					initialCanvasWidth: img.width,
					initialCanvasHeight: img.height,
					initialZoom: mainZoom,
					zoom: mainZoom,
					previewZoom: previewZoom,
					fullPreviewZoom: fullPreviewZoom
				});

				this.refs.pathSize.min = Math.ceil(1 / mainZoom);
				this.refs.pathSize.max = Math.ceil(1 / mainZoom) * 30;

				this.refs.pathSize.value = this.getActivepath().stroke;
				if (this.state.asset.paths.length == 1 && this.state.asset.paths[0].points.length == 0) {
					this.state.asset.paths[0].stroke = parseInt(this.refs.pathSize.value);
				}

				this.centerCanvas();
				this.draw();
				this.startPreview();
			});
		} else {
			this.centerCanvas();
			this.draw();
		}
		this.updateStatus();
	};

	draw = () => {
		var canvas = this.refs.mainCanvas;
		var zoom = this.state.zoom;
		var ctx = canvas.getContext("2d");

		ctx.clearRect(0, 0, canvas.width, canvas.height);
		ctx.drawImage(this.state.asset.img, 0, 0, canvas.width, canvas.height);

		_.each(
			this.state.asset.paths,
			function(path) {
				if (path.points.length >= 2) {
					ctx.beginPath();
					ctx.curve(
						_.map(
							_.flatMap(path.points, _.values),
							(x, i) => x * (i % 2 == 0 ? this.state.initialCanvasWidth : this.state.initialCanvasHeight) * zoom
						),
						0.5,
						10,
						path.closed
					);
					ctx.lineWidth = (path.stroke || 2) * zoom;
					ctx.strokeStyle = "rgba(255, 0, 0, 0.5)";
					ctx.stroke();
				}
				_.each(
					path.points,
					function(point) {
						ctx.beginPath();
						ctx.arc(
							point.x * this.state.initialCanvasWidth * zoom,
							point.y * this.state.initialCanvasHeight * zoom,
							pointSize * _.clamp(zoom, 0.8, 1.5),
							0,
							2 * Math.PI
						);
						ctx.fillStyle = path.active ? "blue" : "red";
						ctx.fill();
					}.bind(this)
				);
			}.bind(this)
		);
	};

	handleCanvasClick = e => {
		if (this.mouseUpHandled) {
			delete this.mouseUpHandled;
			return;
		}

		var x = _.round((e.clientX - $(e.target).offset().left) / (this.state.initialCanvasWidth * this.state.zoom), 3);
		var y = _.round((e.clientY - $(e.target).offset().top) / (this.state.initialCanvasHeight * this.state.zoom), 3);

		if (this.state.mode == "add_point") {
			if (this.state.target) {
				if (
					this.state.target.path.points.indexOf(this.state.target.point) == 0 &&
					this.state.target.path.points.length > 1
				) {
					this.state.target.path.closed = true;
					this.state.history.push({
						action: "close_path",
						target: this.state.target
					});
					this.setState({ mode: "arrow" });
					this.requestCanvasUpdate();
				} else {
					if (!this.state.target.path.active) {
						this.selectTargetedPath();
					}
				}
			} else {
				var path = this.getActivepath();
				var point = { x: x, y: y };
				if (e.altKey && path.points.length >= 2) {
					// add point on an existent line
					path.points.splice(this.getClosestSegmentIndex(x, y), 0, point);
				} else {
					// add normal point
					path.points.push(point);
				}
				this.state.history.push({
					action: "add_point",
					target: {
						path: path,
						point: point
					}
				});
				this.requestCanvasUpdate();
			}
		}
		if (this.state.mode == "arrow" && this.state.target) {
			this.selectTargetedPath();
		}
		if (this.state.mode == "remove_point" && this.state.target) {
			if (this.state.target.path.active) {
				_.remove(this.state.target.path.points, this.state.target.point);
				this.setState({ target: null });
				this.requestCanvasUpdate();
			} else {
				this.selectTargetedPath();
			}
		}
	};

	handleCanvasMouseDown = e => {
		delete this.mouseUpHandled;
		var x = _.round((e.clientX - $(e.target).offset().left) / (this.state.initialCanvasWidth * this.state.zoom), 3);
		var y = _.round((e.clientY - $(e.target).offset().top) / (this.state.initialCanvasHeight * this.state.zoom), 3);

		this.setState({
			dragFromX: x,
			dragFromY: y
		});

		if (this.state.target) this.state.target.grabbed = true;

		if (!this.state.target) {
			this.setState({
				grabbedBackground: true
			});
		}
	};

	handleCanvasMouseUp = e => {
		if (this.state.target) {
			if (this.state.target.dragged) {
				this.state.target.dragged = false;
				this.state.history.push({
					action: "move_point",
					target: this.state.target,
					data: {
						originalX: this.state.dragFromX,
						originalY: this.state.dragFromY
					}
				});
				this.mouseUpHandled = true;
			}
			this.state.target.grabbed = false;
		} else {
			if (this.state.dragBackground) {
				this.state.dragBackground = false;
				this.mouseUpHandled = true;
			}
			this.setState({
				grabbedBackground: false
			});
		}
	};

	handleCanvasMouseMove = e => {
		var x = _.round((e.clientX - $(e.target).offset().left) / (this.state.initialCanvasWidth * this.state.zoom), 3);
		var y = _.round((e.clientY - $(e.target).offset().top) / (this.state.initialCanvasHeight * this.state.zoom), 3);

		if (this.state.grabbedBackground) {
			var deltaX = (this.state.dragFromX - x) * this.state.initialCanvasWidth * this.state.zoom;
			var deltaY = (this.state.dragFromY - y) * this.state.initialCanvasHeight * this.state.zoom;
			if (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5) {
				this.state.dragBackground = true;
				if ($(".canvas-holder").width() < this.state.initialCanvasWidth * this.state.zoom) {
					$(".canvas-holder").scrollLeft($(".canvas-holder").scrollLeft() + deltaX);
				}
				if ($(".canvas-holder").height() < this.state.initialCanvasHeight * this.state.zoom) {
					$(".canvas-holder").scrollTop($(".canvas-holder").scrollTop() + deltaY);
				}
			}
		} else if (this.state.target && this.state.target.grabbed) {
			this.state.target.dragged = true;
			this.state.target.point.x = x;
			this.state.target.point.y = y;
			this.requestCanvasUpdate();
		} else {
			var affected = this.getAffectedPoint(e);
			if (affected) {
				this.setState({ target: affected });
				this.setCanvasCursor(e);
			} else {
				this.setState({ target: null });
				this.setCanvasCursor(e);
			}
		}
	};

	getClosestSegmentIndex = (x, y) => {
		var path = this.getActivepath();
		var minProximity;
		var minProximityIndex;
		for (var i = 1; i < path.points.length; i++) {
			var proximity =
				Math.sqrt(Math.pow(path.points[i - 1].x - x, 2) + Math.pow(path.points[i - 1].y - y, 2)) +
				Math.sqrt(Math.pow(path.points[i].x - x, 2) + Math.pow(path.points[i].y - y, 2));

			proximity /= Math.sqrt(
				Math.pow(path.points[i].x - path.points[i - 1].x, 2) + Math.pow(path.points[i].y - path.points[i - 1].y, 2)
			);

			proximity = Math.abs(1 - proximity);

			if (!minProximity || proximity < minProximity) {
				minProximity = proximity;
				minProximityIndex = i;
			}
		}
		return minProximityIndex;
	};

	getAffectedPoint = e => {
		if (!this.state.asset) return null;

		var x = e.clientX - $(e.target).offset().left;
		var y = e.clientY - $(e.target).offset().top;
		var zoom = this.state.zoom;

		var affectedPoint, affectedPath;
		_.each(
			this.state.asset.paths,
			function(path) {
				_.each(
					path.points,
					function(point) {
						if (
							x >= point.x * this.state.initialCanvasWidth * zoom - pointSize * _.clamp(zoom, 0.8, 1.5) &&
							x <= point.x * this.state.initialCanvasWidth * zoom + pointSize * _.clamp(zoom, 0.8, 1.5) &&
							y >= point.y * this.state.initialCanvasHeight * zoom - pointSize * _.clamp(zoom, 0.8, 1.5) &&
							y <= point.y * this.state.initialCanvasHeight * zoom + pointSize * _.clamp(zoom, 0.8, 1.5)
						) {
							affectedPoint = point;
							affectedPath = path;
							return;
						}
					}.bind(this)
				);
				if (affectedPoint) return;
			}.bind(this)
		);
		if (affectedPoint) {
			return { point: affectedPoint, path: affectedPath };
		} else {
			return null;
		}
	};

	getActivepath = asset => {
		asset = asset || this.state.asset;

		var activepath;
		if (asset)
			_.each(asset.paths, function(path) {
				if (path.active) {
					activepath = path;
					return;
				}
			});

		if (activepath) return activepath;

		asset.paths[0].active = true;
		return asset.paths[0];
	};

	selectTargetedPath = () => {
		this.getActivepath().active = false;
		this.state.target.path.active = true;
		this.refs.pathSize.value = this.state.target.path.stroke;

		this.requestCanvasUpdate();
	};

	setCanvasCursor = e => {
		var cursorClass = "";
		switch (this.state.mode) {
			case "arrow":
				if (this.state.target) {
					cursorClass = "pointer";
					if (this.state.target.path.active) {
						cursorClass = "move";
					}
				}
				break;
			case "add_point":
				cursorClass = "crosshair";
				if (e.altKey && this.getActivepath().points.length >= 2) {
					cursorClass = "white-crosshair";
				}
				if (this.state.target) {
					cursorClass = "pointer";
					if (this.state.target.path.active) {
						cursorClass = "move";
					}
				}
				break;
			case "remove_point":
				if (this.state.target) {
					cursorClass = "pointer";
					if (this.state.target.path.active) {
						cursorClass = "remove";
					}
				}
				break;
			default:
				cursorClass = this.state.mode;
				break;
		}
		this.setState({ canvasCursor: cursorClass });
	};

	centerCanvas = () => {
		var canvasWidth = this.state.initialCanvasWidth * this.state.zoom;
		var canvasHeight = this.state.initialCanvasHeight * this.state.zoom;

		if (canvasWidth < $(".canvas-holder").width() && canvasHeight < $(".canvas-holder").height()) {
			this.setState({ canvasAlign: "absolute-center" });
		} else if (canvasWidth > $(".canvas-holder").width() && canvasHeight < $(".canvas-holder").height()) {
			this.setState({ canvasAlign: "absolute-vcenter" });
		} else if (canvasWidth < $(".canvas-holder").width() && canvasHeight > $(".canvas-holder").height()) {
			this.setState({ canvasAlign: "absolute-hcenter" });
		} else {
			this.setState({ canvasAlign: "" });
		}
	};

	/* --- PREVIEW --- */
	startPreview = () => {
		var canvas = this.state.usingFullPreview ? this.refs.previewCanvasFull : this.refs.previewCanvas;
		if (!canvas) return;

		this.state.asset.createImageCache(
			this.state.zoom,
			this.state.usingFullPreview ? this.state.fullPreviewZoom : this.state.previewZoom
		);

		if (this.currentAnimation) {
			cancelAnimationFrame(this.currentAnimation);
		}

		if (this.startingAnimation) {
			clearTimeout(this.startingAnimation);
			this.startingAnimation = null;
		}

		if (this.img) {
			this.setState({ animationStartTime: Date.now() });
			setTimeout(this.drawPreview, 50);
		} else {
			var img = new Image();
			img.onload = function() {
				this.img = img;
				this.setState({ animationStartTime: Date.now() });
				this.drawPreview();
			}.bind(this);
			img.src = this.props.item.path;
		}
	};

	drawPreview = () => {
		var canvas = this.state.usingFullPreview ? this.refs.previewCanvasFull : this.refs.previewCanvas;
		var zoom = this.state.usingFullPreview ? this.state.fullPreviewZoom : this.state.previewZoom;
		if (!canvas) return;
		var ctx = canvas.getContext("2d");
		var progress = (Date.now() - this.state.animationStartTime) / this.state.asset.animationDuration;

		ctx.globalCompositeOperation = "source-over";
		ctx.clearRect(0, 0, canvas.width, canvas.height);

		var handInfo = this.state.asset.drawPartial(canvas, zoom, progress, true);
		if (handInfo) this.prevHand = Hand.draw(canvas, handInfo.x, handInfo.y, handInfo.angle, this.prevHand);

		if (progress < 1) {
			this.startingAnimation = setTimeout(() => {
				if (this.currentAnimation) {
					cancelAnimationFrame(this.currentAnimation);
				}
				this.currentAnimation = requestAnimationFrame(this.drawPreview);
			}, 1000 / 30);
		} else {
			this.startingAnimation = setTimeout(() => {
				this.startPreview();
			}, 3000);
		}
	};

	handlePreviewClick = () => {
		this.setState({ usingFullPreview: true });
		this.refs.previewModal.show();
		requestAnimationFrame(this.startPreview);
	};

	handleDismissFullPreview = () => {
		this.setState({ usingFullPreview: false });
		requestAnimationFrame(this.startPreview);
	};

	/* --- TOOLS --- */
	setTool = tool => {
		this.setState({ mode: tool });
	};

	beginPathSizeChange = e => {
		this.setState({ intialPathSize: e.target.value });
	};

	endPathSizeChange = e => {
		this.state.history.push({
			action: "change_path_size",
			target: {
				path: this.getActivepath()
			},
			data: {
				originalSize: this.state.intialPathSize
			}
		});
	};

	handlePathSizeChange = e => {
		this.getActivepath().stroke = parseInt(e.target.value);
		this.requestCanvasUpdate();
	};

	handleAddPath = () => {
		this.getActivepath().active = false;
		this.state.asset.paths.push({
			points: [],
			closed: false,
			active: true,
			stroke: parseInt(this.refs.pathSize.value),
			name: "Path " + (this.state.asset.paths.length + 1)
		});
		this.setState({ mode: "add_point" });
		this.requestCanvasUpdate();
	};

	handleDeletePath = path => {
		confirm("Are you sure you want to delete this path? All points on this path will be deleted as well.").then(() => {
			let removedPath = _.cloneDeep(path);

			var paths = _.cloneDeep(this.state.asset.paths);
			_.remove(paths, path);

			if (paths.length == 0) {
				paths.push(_.cloneDeep(emptyPath));
			} else if (removedPath.active) paths[paths.length - 1].active = true;

			this.state.asset.updatePaths(paths);
			this.requestCanvasUpdate();
		});
	};

	handleSelectPath = path => {
		this.getActivepath().active = false;
		path.active = true;
		this.refs.pathSize.value = path.stroke;
		this.forceUpdate();

		this.requestCanvasUpdate();
	};

	handlePathNameChange = (path, name) => {
		path.name = name;
		this.updateStatus();
		this.forceUpdate();
	};

	handlePathDragStart = e => {
		this.draggedFromIndex = e.target.id;
		this.draggedPath = this.state.asset.paths[e.target.id];
	};

	handlePathDragEnd = e => {
		e.preventDefault();
		if (this.draggedPath) {
			_.pullAt(this.state.asset.paths, this.draggedFromIndex);
			this.state.asset.paths.splice(
				this.dropTarget - (this.draggedFromIndex < this.dropTarget ? 1 : 0),
				0,
				this.draggedPath
			);
			this.draggedPath = null;
			this.draggedFromIndex = null;
			this.dropTarget = null;
			$(".path.drop-target").removeClass("drop-target");
			this.requestCanvasUpdate();
		}
	};

	handlePathDragOver = e => {
		e.preventDefault();
		if (!this.dropTarget) {
			this.forceUpdate();
		}
		this.dropTarget = e.target.id;
		$(".path.drop-target").removeClass("drop-target");
		$(e.target).addClass("drop-target");
	};

	handlePathDrop = e => {
		e.preventDefault();
	};

	handleZoomIn = () => {
		var computedZoom = Math.min(this.state.zoom + this.state.initialZoom * 0.4, this.state.initialZoom * 5);
		this.setState({
			zoom: computedZoom
		});
		this.requestCanvasUpdate();
	};

	handleZoomOut = () => {
		var computedZoom = Math.max(this.state.zoom - this.state.initialZoom * 0.4, this.state.initialZoom / 2);
		this.setState({
			zoom: computedZoom
		});
		this.requestCanvasUpdate();
	};

	handleAnimationDurationValue = e => {
		$("#animationDurationLabel").text(Math.floor(e.target.value / 1000) + "s");
	};

	handleAnimationDurationChange = e => {
		this.state.asset.animationDuration = Math.floor(e.target.value / 1000) * 1000;
		this.setState({ requireSave: true });
		setTimeout(() => {
			this.updateStatus();
			this.startPreview();
		}, 50);
	};

	handleUndo = () => {
		var historyEvent = this.state.history.pop();
		if (historyEvent) {
			if (historyEvent.target && historyEvent.target.path && !historyEvent.target.path.active) {
				this.getActivepath().active = false;
				historyEvent.target.path.active = true;
			}
			switch (historyEvent.action) {
				case "add_point":
					_.remove(historyEvent.target.path.points, historyEvent.target.point);
					break;
				case "move_point":
					historyEvent.target.point.x = historyEvent.data.originalX;
					historyEvent.target.point.y = historyEvent.data.originalY;
					break;
				case "close_path":
					historyEvent.target.path.closed = false;
					break;
				case "change_path_size":
					historyEvent.target.path.stroke = historyEvent.data.originalSize;
					this.refs.pathSize = historyEvent.data.originalSize;
					break;
				default:
					break;
			}
			this.requestCanvasUpdate();
		}
	};
}

export default AssetEditor;

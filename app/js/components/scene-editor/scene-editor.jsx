import React from "react";
import PropTypes from "prop-types";
import $ from "jquery";
import _ from "lodash";

import clipBoard from "../../clipboard.js";
const osClipboard = window.require("electron").clipboard;

import "cardinal-spline-js/curve.min.js";

const opentype = _.assignIn(require("opentype.js"), require("../../lib/opentype.extension.js"));

import Scene from "../../models/scene.js";
import Video from "../../models/video.js";

import SceneItemsList from "./scene-items-list.jsx";
import TemplateActions from "./template-actions.jsx";
import SceneActions from "./scene-actions.jsx";
import SceneSettings from "./scene-settings.jsx";
import AssetSettings from "./asset-settings.jsx";
import AssetContextMenu from "./asset-context-menu.jsx";

import Modal from "../common/modal.jsx";
import Hand from "../../hands.js";

const remote = window.require("electron").remote;
const ipcRenderer = window.require("electron").ipcRenderer;

let server_path = "/templates/";

class SceneEditor extends React.Component {
	static propTypes = {
		item: PropTypes.object,
		video: PropTypes.object,
		requiresSave: PropTypes.bool,
		canPreview: PropTypes.bool,
		videoActionListener: PropTypes.func
	};

	state = {
		initialCanvasWidth: 1152, // 60% of 1920
		initialCanvasHeight: 648,
		canvasAlign: "absolute-center",
		canvasCursor: "arrow",
		zoom: 1,
		initialZoom: 1,
		fullPreviewZoom: Math.min(1, ($(window).width() / (1920 * 0.6)) * 0.8),
		selection: [],
		selectionTop: 0,
		selectionLeft: 0,
		selectionWidth: 0,
		selectionHeight: 0,
		style: "whiteboard",
		videoMode: "marker",
		isUpdateForMutiSelect: false,
		initialMTop : 0,
		initialMLeft: 0,
		initialMWidth: 0,
		initialMHeight: 0,
		prescrollLeft: 0,
		prescrollTop: 0,
		isZoomAction : false,
		isResizingAction: false
	};

	componentDidMount() {
		this.mounted = true;
		let computedZoom = Math.min(
			1,
			Math.min(
				($(".canvas-holder").width() - 40) / this.state.initialCanvasWidth,
				($(".canvas-holder").height() - 40) / this.state.initialCanvasHeight
			)
		);
		this.setState({
			zoom: computedZoom,
			initialZoom: computedZoom
		});
		this.load();
		window.addEventListener("resize", this.handleResizeWidnow);
		document.onkeydown = this.handleKeyDown;
		this.refs.canvasScroll.addEventListener('scroll', this.handleScroll);
	}

	componentWillUnmount() {
		this.mounted = false;

		if (this.state.scene) delete this.state.scene.onChangeCallback;

		window.removeEventListener("resize", this.handleResizeWidnow);
		document.onkeydown = null;
		this.refs.canvasScroll.removeEventListener('scroll', this.handleScroll);
	}

	componentDidUpdate(prevProps, prevState) {
		if (this.props.item != prevProps.item) {
			if (prevProps.item) delete prevProps.item.onChangeCallback;

			this.setState({
				selection: [],
				selectionLeft: null,
				selectionTop: null,
				selectionWidth: null,
				selectionHeight: null
			});
			this.load();
		} else {

			if (this.props.video) {
				
				if (this.props.video.style != this.state.style) {
					this.setState({ style: this.props.video.style });					
				}

				if (this.props.video.mode != this.state.videoMode) {
					this.setState({ videoMode: this.props.video.mode });
				}

				if (this.state.scene && !this.state.scene.loading) this.requestCanvasUpdate();
			}
		}
	}

	handleResizeWidnow = () => {
		var me = this;
		this.setState({
			isResizingAction: true
		});
		setTimeout(function(){
			me.updateSelection();
			me.centerCanvas();
		}, 50)
		
	}

	handleScroll = (e) => {
		var s_L = $(".canvas-scroll").scrollLeft();
		var s_T = $(".canvas-scroll").scrollTop();
		var dL = s_L - this.state.prescrollLeft;
		var dT = s_T - this.state.prescrollTop;
		this.setState({
			prescrollLeft: s_L,
			prescrollTop: s_T,
			initialSelectionLeft: this.state.initialSelectionLeft - dL,
			initialSelectionTop: this.state.initialSelectionTop - dT
		});
		var me = this;
		setTimeout(function() {
			me.updateSelection();
		})
		
	}

	handleMouseMove = e => {
		if (this.state.resizing) this.handleSelectionResize(e);
		if (this.state.rotating) {this.handleSelectionRotate(e);};
	};

	handleMouseDown = e => {
		var x = (e.clientX - $(".main-canvas").offset().left) / (this.state.initialCanvasWidth * this.state.zoom);
		var y = (e.clientY - $(".main-canvas").offset().top) / (this.state.initialCanvasHeight * this.state.zoom);

		this.setState({
			dragStartX: x,
			dragStartY: y
		});
	};

	handleMouseUp = e => {
	    if (this.state.resizing) {
			this.setState({ resizing: false });

			$(".handle.active").removeClass("active");
			delete this.cachedAsset;
			this.state.selection.forEach(asset =>
				asset.createImageCache(this.state.zoom, this.state.fullPreviewZoom, this.props.video && this.props.video.style)
			);
			this.state.scene.updateStatus();

			this.state.scene.history.push({
				action: "resize_selection",
				scope: this.state.selection,
				startingZoom: this.state.startingZoom
			});
		}

		if (this.state.rotating) {
			this.setState({ rotating: false });

			this.state.scene.updateStatus();

			this.state.scene.history.push({
				action: "rotate_selection",
				scope: this.state.selection,
				startingAngle: this.state.initialAngle,
				startingItemAngles: this.state.initialSelectionAngles
			});
		}

	    if (this.state.dragging) {
			this.setState({ dragging: false });
			this.state.scene.updateStatus();

			var x = (e.clientX - $(".main-canvas").offset().left) / (this.state.initialCanvasWidth * this.state.zoom);
			var y = (e.clientY - $(".main-canvas").offset().top) / (this.state.initialCanvasHeight * this.state.zoom);

			if (x - this.state.dragStartX != 0 || y - this.state.dragStartY != 0)
				this.state.scene.history.push({
					action: "move_selection",
					scope: this.state.selection,
					initialSelectionPosition: this.state.initialSelectionPosition
				});
		}
	};

	handleMouseClick = e => {

	};

	handleKeyDown = e => {
		if (e.keyCode == 90 && (e.metaKey || e.ctrlKey)) {
			e.preventDefault();
			this.handleUndo();
		}

		// copy
		if (e.keyCode == 67 && (e.metaKey || e.ctrlKey)) {
			if (this.state.selection.length > 0) {
				let items = _.cloneDeep(this.state.selection);
				items.forEach(item => {
					delete item.cache;
					delete item.img;
					delete item.cachedImg;
					delete item.highlightImg;
					delete item.previewCache;
					delete item.eraseImg;
					delete item.previewEraseImg;
					delete item.cache;
					delete item.scene;
				});
				clipBoard.put(items);
				osClipboard.clear();
			}
		}

		// paste
		if (e.keyCode == 86 && (e.metaKey || e.ctrlKey)) {
			if (clipBoard.get() && e.target.nodeName != "TEXTAREA" && e.target.nodeName != "INPUT") {
				this.state.scene.pasteAssets(clipBoard.get());
			}
		}

		let moveByAmount = 2;
		// left
		if (e.keyCode == 37) {
			this.handleMoveSelection(e.shiftKey ? -moveByAmount * 5 : -moveByAmount, 0);
		}
		// up
		if (e.keyCode == 38) {
			this.handleMoveSelection(0, e.shiftKey ? -moveByAmount * 5 : -moveByAmount);
		}
		// right
		if (e.keyCode == 39) {
			this.handleMoveSelection(e.shiftKey ? moveByAmount * 5 : moveByAmount, 0);
		}
		// down
		if (e.keyCode == 40) {
			this.handleMoveSelection(0, e.shiftKey ? moveByAmount * 5 : moveByAmount);
		}
	};

	render() {
		var styles = {
			selection: {
				left: this.state.selectionLeft,
				top: this.state.selectionTop,
				width: this.state.selectionWidth,
				height: this.state.selectionHeight,
				transform: "rotate(" + this.state.selectionAngle + "deg)",
				visibility: this.state.selection.length > 0 ? "visible" : "hidden"
			},
			controls: {
				visibility: this.state.selection.length > 0 ? "visible" : "hidden"
			}
		};
		
		return (
			<div className={"scene-editor flex fill stretch" + " " + (this.props.video && this.props.video.style)}>
				<div
					className="canvas-holder flex fill"
					ref="canvasHolder"
					onMouseUp={this.handleMouseUp}
					onMouseMove={this.handleMouseMove}
					onClick={this.handleMouseClick}
					onMouseDown={this.handleMouseDown}>
					<div className="canvas-scroll fill"
						ref="canvasScroll"
					>
						<canvas
							className={"main-canvas " + this.state.canvasAlign + " " + this.state.canvasCursor}
							ref="mainCanvas"
							width={this.state.initialCanvasWidth * this.state.zoom}
							height={this.state.initialCanvasHeight * this.state.zoom}
							onMouseDown={this.handleCanvasMouseDown}
							onMouseMove={this.handleCanvasMouseMove}
							onClick={this.handleCanvasMouseClick}
							onDoubleClick={this.handleCanvasDoubleClick}
							onDragOver={this.handleDragOver}
							onDrop={this.handleDrop}
							onContextMenu={this.handleCanvasContextMenu}
						/>
					</div>
					<i
						className={!this.state.scene || this.state.scene.loading ? "spinner fa fa-3x fa-refresh fa-spin" : "hidden"}
					/>
					<div className="canvas-controls">
						<button className="btn xs clear grid" onClick={this.toggleShowGrid}>
							<i className="fa fa-th" />&nbsp;{this.state.showGrid ? "Hide" : "Show"} grid
						</button>
					</div>
					<div className="selection" style={styles.selection}>
						<div className="handle top-left" onMouseDown={this.handleSelectionResizeStart}>
							<i className="fa fa-caret-left" />
							<i className="fa fa-caret-right" />
						</div>
						<div className="handle top" onMouseDown={this.handleSelectionResizeStart}>
							<i className="fa fa-caret-left" />
							<i className="fa fa-caret-right" />
						</div>
						<div className="handle top-right" onMouseDown={this.handleSelectionResizeStart}>
							<i className="fa fa-caret-left" />
							<i className="fa fa-caret-right" />
						</div>
						<div className="handle right" onMouseDown={this.handleSelectionResizeStart}>
							<i className="fa fa-caret-left" />
							<i className="fa fa-caret-right" />
						</div>
						<div className="handle bottom-right" onMouseDown={this.handleSelectionResizeStart}>
							<i className="fa fa-caret-left" />
							<i className="fa fa-caret-right" />
						</div>
						<div className="handle bottom" onMouseDown={this.handleSelectionResizeStart}>
							<i className="fa fa-caret-left" />
							<i className="fa fa-caret-right" />
						</div>
						<div className="handle bottom-left" onMouseDown={this.handleSelectionResizeStart}>
							<i className="fa fa-caret-left" />
							<i className="fa fa-caret-right" />
						</div>
						<div className="handle left" onMouseDown={this.handleSelectionResizeStart}>
							<i className="fa fa-caret-left" />
							<i className="fa fa-caret-right" />
						</div>
						<div className="rotate" onMouseDown={this.handleSelectionRotationStart}>
							<div className="fa-stack">
								<i className="fa fa-repeat fa-stack-2x" />
								<i className="fa fa-circle fa-stack-1x" />
							</div>
						</div>
						<div className="selection-controls flex space-between center" style={styles.controls}>
							<div className="align-controls">
								{this.state.selection.length >= 1 &&
									this.state.selection[0].type == "font" &&
									this.state.selection[0].text.indexOf("\n") != -1 && (
										<div>
											<button className="btn clear" title="Align Left" onClick={this.alignTextLeft}>
												<i className="fa fa-lg fa-align-left" />
											</button>
											<button className="btn clear" title="Align Center" onClick={this.alignTextCenter}>
												<i className="fa fa-lg fa-align-center" />
											</button>
											<button className="btn clear" title="Align Right" onClick={this.alignTextRight}>
												<i className="fa fa-lg fa-align-right" />
											</button>
										</div>
									)}
							</div>
							<div className="flex center">
								{this.state.selection.length >= 1 && (
									<div className="flex center">
										{this.state.selection[0].type == "image" &&
											this.props.video &&
											this.state.selection[0].user_id == this.props.user.id && (
												<button
													className="btn clear"
													title="Edit"
													onClick={this.handleEditAsset}
													style={styles.editControl}>
													<img src="images/edit.svg" width="16" height="16" />
												</button>
											)}
										<button
											className="btn clear"
											title="Asset settings"
											style={{ paddingBottom: 3 }}
											onClick={this.showAssetSettings}>
											<i className="fa fa-gear" />
										</button>
										{this.state.selection[0].type == "image" && (
											<button className="btn clear" title="Flip" onClick={this.handleSelectionFlip}>
												<img src="images/flip.svg" />
											</button>
										)}
										<button className="btn clear" title="Bring forward" onClick={this.handleBringForward}>
											<img src="images/bring_forward_2.png" />
										</button>
										<button className="btn clear" title="Send backwards" onClick={this.handleSendBackwards}>
											<img src="images/send_backwards_2.png" />
										</button>
									</div>
								)}
								<button className="btn clear" title="Remove" onClick={this.handleSelectionDelete}>
									<img src="images/trash.png" />
								</button>
							</div>
						</div>
					</div>
					<Modal ref="previewModal" onCancel={this.handleDismissPreview}>
						<canvas
							className="preview-canvas-full"
							ref="previewCanvasFull"
							width={this.state.initialCanvasWidth * this.state.fullPreviewZoom}
							height={this.state.initialCanvasHeight * this.state.fullPreviewZoom}
							onClick={this.pausePreview}
						/>
					</Modal>
					<Modal ref="editTextModal">
						<textarea ref="editTextBox" className="edit-text-box" style={{direction: this.state.editTextRTL ? 'rtl' : 'ltr', unicodeBidi:'bidi-override' }} />
						<div className="flex space-between center">
							<div><input type="checkbox" ref="editTextRTL" 
									checked={this.state.editTextRTL} 
                      				onChange={this.handleTextDirection} /> Right to Left</div>
							<button className="btn success" onClick={this.handleFisnishedEditingText}>
								Done
							</button>
						</div>
					</Modal>
					<div className="toast" ref="toast" />
				</div>

				<div className="right-sidebar flex column">
					{this.state.mode == "template" ? (
						<TemplateActions scene={this.state.scene} {...this.props} sceneActionListener={this.handleAction} />
					) : (
						<SceneActions scene={this.state.scene} {...this.props} sceneActionListener={this.handleAction} />
					)}

					<h3>Tools</h3>
					<div className="group tools">
						<button className="btn" onClick={this.handleZoomIn}>
							<i className="fa fa-search-plus" />
						</button>
						<button className="btn" onClick={this.handleZoomOut}>
							<i className="fa fa-search-minus" />
						</button>
					</div>
					<h3>Items</h3>
					<SceneItemsList
						items={this.state.scene ? this.state.scene.items : []}
						selection={this.state.selection}
						onSelectItem={this.handleSelectItem}
						onChange={this.updateSceneStatus}
					/>
				</div>
				{this.state.mode == "scene" && (
					<SceneSettings
						ref="sceneSettings"
						scene={this.state.scene}
						onChange={this.updateSceneStatus}
						video={this.props.video}
					/>
				)}
				{this.state.selection.length > 0 && (
					<AssetSettings
						ref="assetSettings"
						asset={this.state.selection[0]}
						assets={this.state.selection}
						onChange={this.handleApplyAssetSettings.bind(this, this.state.selection)}
					/>
				)}
				{this.props.video &&
					this.state.selection.length == 1 && (
						<AssetContextMenu ref="assetContextMenu" actionListener={this.handleAction} />
					)}
			</div>
		);
	}

	/* ----- TEMPLATE FUNCTION ----- */
	load = () => {
		if (!this.props.item) return;
		var scene;
		if (this.props.item.cache) {
			// simply open previously loaded scene
			scene = this.props.item;
			scene.onChangeCallback = this.sceneChanged;
		} else {
			// load scene from the server
			scene = new Scene(this.props.item, this.props.video && this.props.video.cache, this.props.video, this.sceneChanged);
		}

		this.setState({
			scene: scene,
			mode: this.props.item.type == "template" ? "template" : "scene",
			history: []
		});

		if (!scene.loading) {
			if (this.state.zoom != scene.cachedMainZoom)
				scene.updateImageCache(this.state.zoom, 0, this.props.video && this.props.video.style);
			this.requestCanvasUpdate();
		}

		if (this.props.video)
			this.setState({
				style: this.props.video.style
			});

		server_path = this.props.item.type == "template" ? "/templates/" : "/scenes";
	};

	sceneChanged = errorRequest => {
		let time = Date.now();
		if (!this.mounted) return;
		if (!errorRequest) {
			if (this.props.videoActionListener) this.props.videoActionListener("change");
			else this.forceUpdate();

			this.requestCanvasUpdate();
		} else this.props.handleAjaxFail(errorRequest, this.load);
	};

	save = () => {
		$(".toast")
			.html("Saving...")
			.fadeIn(500);

		this.state.scene.save(errorRequest => {
			if (!errorRequest) {
				$(".toast").html("Saved successfully");
				setTimeout(() => {
					$(".toast").fadeOut(500);
				}, 2000);
				this.props.item.thumb_path = this.state.scene.thumbnail;
				if (this.props.item.onStatusChange) {
					this.props.item.onStatusChange();
				}
			} else this.props.handleAjaxFail(errorRequest, this.save);
		});
	};
	publish = () => {
		$(".toast")
			.html("Publishing...")
			.fadeIn(500);
		$.ajax({
			url: server_url + "/templates/" + this.props.item.id,
			type: "PUT",
			data: { status: "published" }
		})
			.done(data => {
				this.props.item.status = "published";
				if (this.props.item.onStatusChange) {
					this.props.item.onStatusChange();
				}
				this.forceUpdate();
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
			url: server_url + "/templates/" + this.props.item.id,
			type: "PUT",
			data: { status: "none" }
		})
			.done(data => {
				this.props.item.status = "none";
				if (this.props.item.onStatusChange) {
					this.props.item.onStatusChange();
				}
				this.forceUpdate();
			})
			.fail((request, textStatus, error) => this.props.handleAjaxFail(request, this.unpublish))
			.always(() => {
				$(".toast").fadeOut();
			});
	};

	delete = () => {
		confirm("Are you sure you want to delete this template? This action is not reversible.").then(() => {
			$(".toast")
				.html("Deleting template...")
				.fadeIn(500);
			$.ajax({
				url: server_url + server_path + this.props.item.id,
				type: "DELETE",
				data: { status: "inactive" }
			})
				.done(data => {
					// notify the uppser authority that the template is no more so that the scene editor is closed
					if (this.props.item.onStatusChange) {
						this.props.item.status = "deleted";
						this.props.item.onStatusChange();
					}
				})
				.fail((request, textStatus, error) => this.props.handleAjaxFail(request, this.unpublish))
				.always(() => {
					$(".toast").fadeOut();
				});
		});
	};

	finishEditing = () => {
		if (!this.state.scene.requiresSave) this.props.item.onClose();
		else
			confirm("This scene has unsaved changes that will be discarded. Are you sure you want to continue?").then(() => {
				this.props.item.onClose();
			});
	};

	handleAction = action => {
		if (typeof action == "object") {
			var data = action.data;
			var action = action.action;
		}
		if (this.state.mode == "template") {
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
				case "delete":
					this.delete();
					break;
				case "finish_editing":
					this.finishEditing();
					break;
				case "preview":
					this.startPreview();
					break;
				default:
			}
		} else {
			switch (action) {
				case "settings":
					this.refs.sceneSettings.show();
					break;
				case "erase_asset":
					if (this.props.video) {
						this.state.scene.eraseAsset(data.asset);
						this.props.video.duplicateScene(
							this.props.video.scenes.findIndex(scene => scene.getDataString() == this.state.scene.getDataString())
						);
					}
					break;
				default:
					if (this.props.videoActionListener) {
						// pass the action to the video editor
						this.props.videoActionListener(action);
					}
			}
		}
	};

	handleUndo = () => {
		var historyEvent = this.state.scene.history.pop();
		if (historyEvent) {
			switch (historyEvent.action) {
				case "add_item":
					this.state.scene.removeAssets(
						historyEvent.scope instanceof Array ? historyEvent.scope : [historyEvent.scope]
					);
					this.clearSelection();
					break;
				case "move_selection":
					historyEvent.scope.forEach((item, index) => {
						item.x = historyEvent.initialSelectionPosition[index].x;
						item.y = historyEvent.initialSelectionPosition[index].y;
					});
					this.setState({ selection: historyEvent.scope });
					this.state.scene.updateStatus();
					this.requestCanvasUpdate();
					break;
				case "resize_selection":
					historyEvent.scope.forEach((item, index) => {
						item.zoom = historyEvent.startingZoom[index];
					});
					this.setState({ selection: historyEvent.scope });
					this.state.scene.updateStatus();
					this.requestCanvasUpdate();
					break;
				case "rotate_selection":
					historyEvent.scope.forEach((item, index) => {
						item.angle = _.round(historyEvent.startingAngle + historyEvent.startingItemAngles[index], 2);
					});
					this.setState({ selection: historyEvent.scope });
					this.state.scene.updateStatus();
					this.requestCanvasUpdate();
					break;
				case "change_animation_delay":
					historyEvent.scope.animationDelay = historyEvent.prevValue;
					this.state.scene.updateStatus();
					this.forceUpdate();
					break;
				case "change_animation_duration":
					historyEvent.scope.animationDuration = historyEvent.prevValue;
					this.state.scene.updateStatus();
					this.forceUpdate();
					break;
				default:
					break;
			}
		}
	};

	/* ----- DRAG AND DROP ----- */
	handleDragOver = e => {
		e.preventDefault();
	};

	handleDrop = e => {
		if (!this.state.scene || this.state.scene.loading) return;

		var item = JSON.parse(e.dataTransfer.getData("item"));
		if (item.type == "sound") {
			alert("You cannot drop audio files to scenes. Please drag them to the audio timeline below.");
			return;
		}

		var x = _.round((e.clientX - $(e.target).offset().left) / (this.state.initialCanvasWidth * this.state.zoom), 3),
			y = _.round((e.clientY - $(e.target).offset().top) / (this.state.initialCanvasHeight * this.state.zoom), 3);

		this.addAsset(item, x, y);
	};

	addAsset = (item, x, y) => {
		if (this.state.scene.loading) return;

		this.state.scene.loading = 1;
		this.forceUpdate();

		var item = _.cloneDeep(item);

		this.state.scene.addAsset(
			item,
			x,
			y,
			{
				width: this.state.initialCanvasWidth,
				height: this.state.initialCanvasHeight
			},
			item => {
				if (item instanceof Array)
					item.forEach(asset =>
						asset.createImageCache(
							this.state.zoom,
							this.state.fullPreviewZoom,
							this.props.video && this.props.video.style
						)
					);
				else
					item.createImageCache(
						this.state.zoom,
						this.state.fullPreviewZoom,
						this.props.video && this.props.video.style
					);

				this.state.scene.history.push({
					action: "add_item",
					scope: item
				});
			}
		);

		if (item.type == "template") this.clearSelection();
	};

	/* ----- CANVAS ----- */
	requestCanvasUpdate() {
		if (this.updatingCanvas) {
			cancelAnimationFrame(this.updatingCanvas);
		}
		this.updatingCanvas = requestAnimationFrame(this.updateCanvas);
	}

	updateCanvas = () => {
		var canvas = this.refs.mainCanvas;
		if (!canvas) return;
		var ctx = canvas.getContext("2d");

		// clear canvas
		ctx.globalCompositeOperation = "source-over";

		if(this.props.video) {
			if(this.props.video.background.type == Video.BackgroundTypeImage) {
				ctx.drawImage(this.props.video.background.backgroundImage, 0, 0, canvas.width, canvas.height);
			} else {
				ctx.fillStyle = this.props.video.background.backgroundColor;
				ctx.fillRect(0, 0, canvas.width, canvas.height);
			}
		} else {
			ctx.fillStyle = Video.BackgroundDefaultColor;
			ctx.fillRect(0, 0, canvas.width, canvas.height);
		}

		if (this.state.showGrid) {
			let lightColor =
				this.props.video.style == Video.StyleWhiteboard || this.props.video.style == Video.StyleGlassboard ? "#ccc" : "#666";
			let darkColor =
				this.props.video.style == Video.StyleWhiteboard || this.props.video.style == Video.StyleGlassboard ? "#999" : "#000";
			ctx.save();
			ctx.globalCompositeOperation = "source-over";
			ctx.globalAlpha = this.props.video.style == Video.StyleWhiteboard || this.props.video.style == Video.StyleGlassboard ? 1 : 0.5;
			for (var i = 1; i < 50; i++) {
				ctx.beginPath();
				ctx.strokeStyle = i % 5 == 0 ? darkColor : lightColor;
				ctx.setLineDash([2, 2]);
				ctx.moveTo((canvas.width / 50) * i, 0);
				ctx.lineTo((canvas.width / 50) * i, canvas.height);
				ctx.moveTo(0, (canvas.width / 50) * i);
				ctx.lineTo(canvas.width, (canvas.width / 50) * i);
				ctx.stroke();
			}
			ctx.restore();
		}

		let tempCanvas = document.createElement("canvas");
		tempCanvas.width = canvas.width;
		tempCanvas.height = canvas.height;
		this.state.scene.draw(tempCanvas, this.state.zoom, this.state.hoverTarget, false, this.state.style);

		if (this.state.style == Video.StyleGlassboard) {
			ctx.globalCompositeOperation = "multiply";
		} else {
			if (this.state.videoMode == Video.ModeChalk) {
				ctx.globalCompositeOperation = "screen";
			}
		}

		ctx.drawImage(tempCanvas, 0, 0);

		//this.updateSelection();
		this.setCanvasCursor();
		this.centerCanvas();
	};

	handleCanvasMouseMove = e => {
		if (!this.state.scene || this.state.scene.loading) return;

		if (this.state.dragging) {

			this.handleSelectionDrag(e);

		} else if (!this.state.resizing && !this.state.rotating) {

			var x = (e.clientX - $(".main-canvas").offset().left) / (this.state.initialCanvasWidth * this.state.zoom);
            var y = (e.clientY - $(".main-canvas").offset().top) / (this.state.initialCanvasHeight * this.state.zoom);
			var target = this.getObjectAt(x, y);
			if (this.state.hoverTarget != target) {
				this.setState({ hoverTarget: target });
				this.requestCanvasUpdate();
			}
		}
	};

	handleCanvasMouseDown = e => {


		let isSelectionUpdated = false;
        let isDragging = false;

		if (this.state.hoverTarget) {

            // get selected targets
            let selectedTargets = this.state.selection;
            if ( e.metaKey || e.ctrlKey ) {
                let index = selectedTargets.indexOf(this.state.hoverTarget)
                if(index == -1) {
                    selectedTargets.push(this.state.hoverTarget);
                } else {
                    selectedTargets.splice(index, 1)
                }
                isSelectionUpdated = true;
            } else {
            	if(selectedTargets.indexOf(this.state.hoverTarget) == -1) {
                    selectedTargets =  [this.state.hoverTarget];
                    isSelectionUpdated = true;
				} else {
                    selectedTargets =  this.state.selection;
				}
            }

            this.state.selection = selectedTargets;

            isDragging = true;

		} else {

            var x = e.clientX - $(".canvas-holder").offset().left;
            var y = e.clientY - $(".canvas-holder").offset().top;

            var rx = this.state.selectionLeft + this.state.selectionWidth / 2,
                ry = this.state.selectionTop + this.state.selectionHeight / 2,
                width = this.state.selectionWidth,
                height = this.state.selectionHeight,
                angle = this.state.selectionAngle;

            if (this.pointInsideRectangle(rx, ry, width, height, angle, x, y)) {

                isDragging = true;

            } else {

                this.clearSelection();
                isSelectionUpdated = true;
			}
		}

		if(isSelectionUpdated) {
			if (this.state.selection.length > 1) {
				this.setState({selectionAngle : 0});
			}
			var me  = this;
			setTimeout(function() {
				me.updateSelection();
			},100);
            // this.updateSelection();
		}

		if(isDragging) {

            this.handleSelectionDragStart(e);
		}
	};

	handleCanvasMouseClick = e => {

	};

	handleCanvasDoubleClick = e => {
		if (this.state.hoverTarget && this.state.hoverTarget.type == "font") {
			this.refs.editTextBox.value = this.state.hoverTarget.text;
			this.setState({
				editTextRTL: this.state.hoverTarget.direction == 'rtl' ? true : false
			});
			this.refs.editTextModal.show();
		}
	};

	handleTextDirection = e => {
		this.setState({
			editTextRTL: e.target.checked
		});
	}

    handleSelectionDragStart = e => {

        this.state.selection.forEach(asset => {
            asset.initialSelectionPosition = { x: asset.x, y: asset.y };
        });

        this.setState({
            dragging: true,
            initialSelectionLeft: this.state.selectionLeft,
            initialSelectionTop: this.state.selectionTop,
            selection: this.state.selection
        });
	};

    handleSelectionDrag = e => {

        var x = (e.clientX - $(".main-canvas").offset().left) / (this.state.initialCanvasWidth * this.state.zoom);
        var y = (e.clientY - $(".main-canvas").offset().top) / (this.state.initialCanvasHeight * this.state.zoom);

        var offsetX = (x - this.state.dragStartX);
        var offsetY = (y - this.state.dragStartY);

    	_.each(
            this.state.selection,
            function(asset) {
                asset.x = _.round(asset.initialSelectionPosition.x + offsetX, 3);
                asset.y = _.round(asset.initialSelectionPosition.y + offsetY, 3);
            }.bind(this)
        );
        this.requestCanvasUpdate();

        // Update selector
        offsetX *= (this.state.initialCanvasWidth * this.state.zoom);
        offsetY *= (this.state.initialCanvasHeight * this.state.zoom);

        this.setState({
            selectionLeft: this.state.initialSelectionLeft + offsetX,
            selectionTop: this.state.initialSelectionTop + offsetY
        });
    };

	handleSelectionResizeStart = e => {

		var x = e.clientX - $(".canvas-holder").offset().left;
		var y = e.clientY - $(".canvas-holder").offset().top;

	    this.state.selection.forEach(asset => {
			asset.initialSelectionPosition = { x: asset.x, y: asset.y };
	    });

		$(e.target).addClass("active");

		this.state.initialSelectionLeft = this.state.selectionLeft;
        this.state.initialSelectionTop = this.state.selectionTop;
        this.state.initialSelectionWidth = this.state.selectionWidth;
        this.state.initialSelectionHeight = this.state.selectionHeight;

		this.setState({
			resizing: true,
			resizingHandle: e.target,
			initialX: x,
			initialY: y,
			initialSelectionLeft: this.state.selectionLeft,
			initialSelectionTop: this.state.selectionTop,
			initialSelectionWidth: this.state.selectionWidth,
			initialSelectionHeight: this.state.selectionHeight,
			startingZoom: this.state.selection.map(asset => asset.zoom),
			hoverTarget: null
		});
	};

	handleSelectionResize = e => {
		var zoomDelta, deltaX, deltaY, zoomDeltaX, zoomDeltaY;

		var x = e.clientX - $(".canvas-holder").offset().left;
		var y = e.clientY - $(".canvas-holder").offset().top;

	    var initialWidth = this.state.initialSelectionWidth + 6;
	    var initialHeight = this.state.initialSelectionHeight + 6;

	    var handleClass = this.state.resizingHandle.className;

	    if (this.state.resizing) {
	      // determine handle position
	      var isLeft =
	        this.state.initialX <
	        this.state.initialSelectionLeft + this.state.initialSelectionWidth / 2 - this.state.initialSelectionWidth * 0.1;
	      var isRight =
	        this.state.initialX >
	        this.state.initialSelectionLeft + this.state.initialSelectionWidth / 2 + this.state.initialSelectionWidth * 0.1;
	      var isTop =
	        this.state.initialY <
	        this.state.initialSelectionTop + this.state.initialSelectionHeight / 2 - this.state.initialSelectionHeight * 0.1;
	      var isBottom =
	        this.state.initialY >
	        this.state.initialSelectionTop + this.state.initialSelectionHeight / 2 + this.state.initialSelectionHeight * 0.1;

	      deltaX = (x - this.state.initialX) * (isLeft ? -1 : 1);
	      deltaY = (y - this.state.initialY) * (isTop ? -1 : 1);

	      if (isLeft || isRight) zoomDeltaX = (deltaX * 2) / initialWidth;
	      if (isTop || isBottom) zoomDeltaY = (deltaY * 2) / initialHeight;

	      if (zoomDeltaX) zoomDelta = zoomDeltaX;
	      if (zoomDeltaY) zoomDelta = zoomDeltaY;
	      if (zoomDeltaX && zoomDeltaY) zoomDelta = Math.abs(zoomDeltaX) > Math.abs(zoomDeltaY) ? zoomDeltaX : zoomDeltaY;

	      if (zoomDelta) {

            let zoomVal = 1 + zoomDelta;

            // Calculate Center
            var centerX0 = this.state.initialSelectionLeft + this.state.initialSelectionWidth / 2;
            var centerY0 = this.state.initialSelectionTop + this.state.initialSelectionHeight / 2;

            let left = $(".main-canvas").offset().left - $(".canvas-holder").offset().left + $(".canvas-holder").scrollLeft();
            let top = $(".main-canvas").offset().top - $(".canvas-holder").offset().top + $(".canvas-holder").scrollTop();

            var centerX = (centerX0-left)/(this.state.initialCanvasWidth * this.state.zoom);
            var centerY = (centerY0-top)/(this.state.initialCanvasHeight * this.state.zoom);

            // Scaling assets
	        for (var i = 0; i < this.state.selection.length; i++) {
	          this.state.selection[i].zoom = _.round(
	            Math.max(0.1, this.state.startingZoom[i] + zoomDelta * this.state.startingZoom[i]),
	            3
	          );
	          if (zoomVal > 0.1) {
	            this.state.selection[i].zoomDelta = zoomDelta;
	            let asset = this.state.selection[i];
	            let dx = asset.initialSelectionPosition.x;
	            let dy = asset.initialSelectionPosition.y;
	            dx = dx - centerX;
	            dy = dy - centerY;
	            dx = dx * zoomVal;
	            dy = dy * zoomVal;
	            dx = dx + centerX;
	            dy = dy + centerY;
	            asset.x = dx;
	            asset.y = dy;
	          }
	        }

	        // Update selector
			if(zoomVal > 0.1) {
                  this.state.selectionWidth = this.state.initialSelectionWidth * zoomVal;
                  this.state.selectionHeight = this.state.initialSelectionHeight * zoomVal;
                  this.state.selectionLeft =  centerX0 - this.state.selectionWidth / 2;
                  this.state.selectionTop =  centerY0 - this.state.selectionHeight / 2;

                  this.setState({
                      selectionWidth: this.state.selectionWidth,
                      selectionHeight: this.state.selectionHeight,
                      selectionLeft: this.state.selectionLeft,
                      selectionTop: this.state.selectionTop,
                  });
			}
	      }

	      this.requestCanvasUpdate();
	    }
	};

	handleSelectionRotationStart = e => {

		this.state.selection.forEach(asset => {
			asset.initialSelectionPosition = { x: asset.x, y: asset.y };
	    });

	    this.setState({
			rotating: true,
			initialSelectionAngles: this.state.selection.map(asset => asset.angle),
			initialAngle: this.state.selectionAngle,
			hoverTarget: null
	    });
	};

	handleSelectionRotate(e) {

		// Update assets position
		let x = e.clientX - $(".canvas-holder").offset().left;
        let y = e.clientY - $(".canvas-holder").offset().top;

        let centerX = this.state.selectionLeft + this.state.selectionWidth / 2;
        let centerY = this.state.selectionTop + this.state.selectionHeight / 2;

	    let left = $(".main-canvas").offset().left - $(".canvas-holder").offset().left + $(".canvas-holder").scrollLeft();
	    let top = $(".main-canvas").offset().top - $(".canvas-holder").offset().top + $(".canvas-holder").scrollTop();

	    centerX = (centerX-left)/(this.state.initialCanvasWidth * this.state.zoom);
		centerY = (centerY-top)/(this.state.initialCanvasHeight * this.state.zoom);

	    let canvas_width = $(".main-canvas").width();
	    let canvas_height = $(".main-canvas").height();
	    let canvas_rate = canvas_width / canvas_height;

		let angle = (Math.atan2(
			(y - centerY * (this.state.initialCanvasHeight * this.state.zoom) - top),
			x - centerX * (this.state.initialCanvasWidth * this.state.zoom) - left) * 180.0) / Math.PI;
    	let diffangle = angle - this.state.initialAngle;

		for (var i = 0; i < this.state.selection.length; i++) {
			var asset = this.state.selection[i];
			asset.angle = this.state.initialSelectionAngles[i] + diffangle;
			let initX = asset.initialSelectionPosition.x, initY = asset.initialSelectionPosition.y;
			initX = initX - centerX; initY = initY - centerY;
			initX = initX * canvas_rate;
			let dx = (initX) * Math.cos(diffangle * Math.PI / 180) - (initY) * Math.sin(diffangle * Math.PI / 180);
			let dy = (initX) * Math.sin(diffangle * Math.PI / 180) + (initY) * Math.cos(diffangle * Math.PI / 180);
			dx = dx / canvas_rate;
			asset.x = dx + centerX; asset.y = dy + centerY;
		}

        this.requestCanvasUpdate();

        // Update selector angle
		this.setState({ selectionAngle: angle });
		// this.updateSelection();

	}

	handleSelectionFlip = e => {

		e.stopPropagation();

        let x = e.clientX - $(".canvas-holder").offset().left;
        let y = e.clientY - $(".canvas-holder").offset().top;

        let centerX = this.state.selectionLeft + this.state.selectionWidth / 2;
        let centerY = this.state.selectionTop + this.state.selectionHeight / 2;

        let left = $(".main-canvas").offset().left - $(".canvas-holder").offset().left + $(".canvas-holder").scrollLeft();
        let top = $(".main-canvas").offset().top - $(".canvas-holder").offset().top + $(".canvas-holder").scrollTop();

        centerX = (centerX-left)/(this.state.initialCanvasWidth * this.state.zoom);
        centerY = (centerY-top)/(this.state.initialCanvasHeight * this.state.zoom);

        let canvas_width = $(".main-canvas").width();
        let canvas_height = $(".main-canvas").height();
        let canvas_rate = canvas_width / canvas_height;

        let diffangle = 0 - this.state.selectionAngle;

        for (var i = 0; i < this.state.selection.length; i++) {
            var asset = this.state.selection[i];
            asset.angle = asset.angle + diffangle;
            let initX = asset.x, initY = asset.y;
            initX = initX - centerX; initY = initY - centerY;
            initX = initX * canvas_rate;
            let dx = (initX) * Math.cos(diffangle * Math.PI / 180) - (initY) * Math.sin(diffangle * Math.PI / 180);
            let dy = (initX) * Math.sin(diffangle * Math.PI / 180) + (initY) * Math.cos(diffangle * Math.PI / 180);
            dx = dx / canvas_rate;
            asset.x = dx + centerX; asset.y = dy + centerY;

            if (asset.type != "font")
            	asset.flipped = !asset.flipped;
            asset.angle = -asset.angle;
            asset.x = centerX - (asset.x - centerX);
        }

        diffangle = this.state.selectionAngle - 0;

        for (var i = 0; i < this.state.selection.length; i++) {
            var asset = this.state.selection[i];
            asset.angle = asset.angle + diffangle;
            let initX = asset.x, initY = asset.y;
            initX = initX - centerX; initY = initY - centerY;
            initX = initX * canvas_rate;
            let dx = (initX) * Math.cos(diffangle * Math.PI / 180) - (initY) * Math.sin(diffangle * Math.PI / 180);
            let dy = (initX) * Math.sin(diffangle * Math.PI / 180) + (initY) * Math.cos(diffangle * Math.PI / 180);
            dx = dx / canvas_rate;
            asset.x = dx + centerX; asset.y = dy + centerY;
        }

        this.state.scene.updateStatus();
		this.requestCanvasUpdate();
	};

	handleSelectionDelete = e => {
		e.stopPropagation();
		confirm(
			"Your are about to remove the selected assets from this scene. You can add them back later by browsing the asset library. \nAre you sure you want to continue?"
		).then(() => {
			this.state.scene.removeAssets(this.state.selection);

			this.setState({
				selection: [],
				selectionLeft: null,
				selectionTop: null,
				selectionWidth: null,
				selectionHeight: null
			});
			this.state.scene.updateStatus();
			this.requestCanvasUpdate();
		});
	};

	rearrangeByZOrder = (assets, direction=1) => { // direction : 1 means top to bottom, -1 means bottom to top.
		assets.sort((asset1, asset2) => {
			return (this.state.scene.items.indexOf(asset2) - this.state.scene.items.indexOf(asset1)) * direction;
		});
		return assets;
	};

	handleBringForward = e => {
		e.stopPropagation();

		if(this.state.selection.length > 1) {
			var isFront = false;
			var len = this.state.scene.items.length;
			this.state.selection.forEach( selectedAsset => {
				var selectedIndex = this.state.scene.items.indexOf(selectedAsset);
				if(selectedIndex == len-1) {
					isFront = true;
				}
			});
			if(isFront) return;
		}

		// only works if only one object is selected
		let selectedAssets = this.state.selection;
		selectedAssets = this.rearrangeByZOrder(selectedAssets);

		selectedAssets.forEach( selectedAsset => {
			var selectedIndex = this.state.scene.items.indexOf(selectedAsset);
			for (var i = selectedIndex + 1; i < this.state.scene.items.length; i++) {
				if (!selectedAssets.includes(this.state.scene.items[i]) && this.assetsIntersect(selectedAsset, this.state.scene.items[i])) {
					this.state.scene.items = _.without(this.state.scene.items, selectedAsset);
					this.state.scene.items.splice(i, 0, selectedAsset);
					this.forceUpdate();
					break;
				}
			}
			this.state.scene.updateStatus();
		});
		this.requestCanvasUpdate();
	};

	handleSendBackwards = e => {
		e.stopPropagation();

		if(this.state.selection.length > 1) {
			var isBack = false;
			this.state.selection.forEach( selectedAsset => {
				var selectedIndex = this.state.scene.items.indexOf(selectedAsset);
				if(selectedIndex == 0) {
					isBack = true;
				}
			});
			if(isBack) return;
		}

		// only works if only one object is selected
		let selectedAssets = this.state.selection;
		selectedAssets = this.rearrangeByZOrder(selectedAssets, -1);

		selectedAssets.forEach( selectedAsset =>{		
			var selectedIndex = this.state.scene.items.indexOf(selectedAsset);
			for (var i = selectedIndex - 1; i >= 0; i--) {
				if (!selectedAssets.includes(this.state.scene.items[i]) && this.assetsIntersect(selectedAsset, this.state.scene.items[i])) {
					this.state.scene.items = _.without(this.state.scene.items, selectedAsset);
					this.state.scene.items.splice(i, 0, selectedAsset);
					this.forceUpdate();
					break;
				}
			}
			this.state.scene.updateStatus();
		});
		this.requestCanvasUpdate();
	};

	getObjectAt = (x, y) => {
		for (var i = this.state.scene.items.length - 1; i >= 0; i--) {
			var item = this.state.scene.items[i];
			var rx = item.x * this.state.initialCanvasWidth * this.state.zoom,
				ry = item.y * this.state.initialCanvasHeight * this.state.zoom,
				angle = item.angle || 0,
				px = x * this.state.initialCanvasWidth * this.state.zoom,
				py = y * this.state.initialCanvasHeight * this.state.zoom,
				size = item.measure(this.refs.mainCanvas, this.state.zoom);

			var p = this.pointInsideRectangle(rx, ry, size.width, size.height, angle, px, py);
			if (p && this.assetHasContentAt(item, p.x, p.y)) return item;
		}
		return null;
	};

	updateSelection = () => {
		
	    if( this.isSelected() ) {

			// console.log(this.state);
			

			if(this.state.selection.length == 1) {
				var minLeft = _.min(
					this.state.selection.map(
						asset => {
							console.log(asset.measure(this.refs.mainCanvas, this.state.zoom));
							console.log(asset);
							return asset.x * this.state.initialCanvasWidth * this.state.zoom -
								asset.measure(this.refs.mainCanvas, this.state.zoom).width / 2;
						}
					)
				);
				var minTop = _.min(
					this.state.selection.map(
					  asset => {
						  return asset.y * this.state.initialCanvasHeight * this.state.zoom -
							  asset.measure(this.refs.mainCanvas, this.state.zoom).height / 2;
					  }
					)
				);
				var maxRight = _.max(
					this.state.selection.map(
						asset => {
							return asset.x * this.state.initialCanvasWidth * this.state.zoom +
								asset.measure(this.refs.mainCanvas, this.state.zoom).width / 2;
						}
					)
				);
				var maxBottom = _.max(
					this.state.selection.map(
						asset => {
							return asset.y * this.state.initialCanvasHeight * this.state.zoom +
								asset.measure(this.refs.mainCanvas, this.state.zoom).height / 2;
						}
					)
				);
			} else if(this.state.selection.length > 1) {
				var allpointsX = [];
				var allpointsY = [];
				this.state.selection.map(
					asset => {
						var cx = asset.x * this.state.initialCanvasWidth * this.state.zoom;
						var cy = asset.y * this.state.initialCanvasHeight * this.state.zoom;
						var m = asset.measure(this.refs.mainCanvas, this.state.zoom);
						var cos = Math.cos(asset.angle * Math.PI / 180);
						var sin = Math.sin(asset.angle * Math.PI / 180);

						var tx1 = - m.width / 2; var ty1 = - m.height / 2; var dx1 = tx1 * cos - ty1 * sin; var dy1 = tx1 * sin + ty1 * cos; allpointsX.push(dx1 + cx); allpointsY.push(dy1 + cy);
						var tx2 = m.width / 2;   var ty2 = - m.height / 2; var dx2 = tx2 * cos - ty2 * sin; var dy2 = tx2 * sin + ty2 * cos; allpointsX.push(dx2 + cx); allpointsY.push(dy2 + cy);
						var tx3 = m.width / 2;   var ty3 = m.height / 2;   var dx3 = tx3 * cos - ty3 * sin; var dy3 = tx3 * sin + ty3 * cos; allpointsX.push(dx3 + cx); allpointsY.push(dy3 + cy);
						var tx4 = - m.width / 2; var ty4 = m.height / 2;   var dx4 = tx4 * cos - ty4 * sin; var dy4 = tx4 * sin + ty4 * cos; allpointsX.push(dx4 + cx); allpointsY.push(dy4 + cy);
					}
				);
				var minLeft = _.min(allpointsX);
				var minTop = _.min(allpointsY);
				var maxRight = _.max(allpointsX);
				var maxBottom = _.max(allpointsY);

				if (this.state.isZoomAction || this.state.isResizingAction) {
					var cx  = (minLeft + maxRight) / 2;
					var cy = (minTop + maxBottom) / 2;
					minLeft = cx - this.state.initialSelectionWidth / 2;
					minTop = cy - this.state.initialSelectionHeight / 2;
					maxRight = cx + this.state.initialSelectionWidth / 2;
					maxBottom = cy + this.state.initialSelectionHeight / 2;
					
				}

			}

			

			let left =
				$(".main-canvas").offset().left -
				$(".canvas-holder").offset().left +
				$(".canvas-holder").scrollLeft() +
				minLeft;
			let top =
				$(".main-canvas").offset().top - $(".canvas-holder").offset().top + $(".canvas-holder").scrollTop() + minTop;

			let width = maxRight - minLeft;
			let height = maxBottom - minTop;
			let angle = 0;
			if(this.state.selection.length === 1) {
				angle = this.state.selection[0].angle;
			} 
			else {
				angle = this.state.selectionAngle;
			}



			this.state.selectionAngle = angle;
            this.state.selectionLeft = left;
            this.state.selectionTop = top;
            this.state.selectionWidth = width;
			this.state.selectionHeight = height;
			
			if(this.state.selection.length > 1 && this.state.selectionAngle == 0 && this.state.isUpdateForMutiSelect) {
				this.setState({
					initialSelectionLeft: left,
					initialSelectionTop: top,
					initialSelectionWidth: width,
					initialSelectionHeight: height,
					isUpdateForMutiSelect: false
				});
			} else if(this.state.selection.length > 1 && !this.state.isUpdateForMutiSelect) {
		
				if (this.state.isResizingAction || this.state.isZoomAction) {
					this.setState({
						isZoomAction: false,
						isResizingAction: false,
						selectionAngle: this.state.selectionAngle,
						selectionLeft: left,
						selectionTop: top,
						selectionWidth: this.state.initialSelectionWidth,
						selectionHeight: this.state.initialSelectionHeight
					});
				} else {
					this.setState({
						selectionAngle: this.state.selectionAngle,
						selectionLeft: this.state.initialSelectionLeft,
						selectionTop: this.state.initialSelectionTop,
						selectionWidth: this.state.initialSelectionWidth,
						selectionHeight: this.state.initialSelectionHeight
					});
				}
			} else {
				this.setState({
					selectionAngle: this.state.selectionAngle,
					selectionLeft: this.state.selectionLeft,
					selectionTop: this.state.selectionTop,
					selectionWidth: this.state.selectionWidth,
					selectionHeight: this.state.selectionHeight
				});
			}
		}
	};

	setCanvasCursor = () => {
		var cursor = "arrow";
		if (this.state.hoverTarget) {
			cursor = "pointer";
		}
		if (this.state.hoverTarget && this.state.selection.indexOf(this.state.hoverTarget) != -1) {
			cursor = "move";
		}

		if (cursor != this.state.canvasCursor) this.setState({ canvasCursor: cursor });
	};

	centerCanvas = () => {
		let canvasWidth = this.state.initialCanvasWidth * this.state.zoom;
		let canvasHeight = this.state.initialCanvasHeight * this.state.zoom;
		var align = "";

		if (canvasWidth < $(".canvas-holder").width() && canvasHeight < $(".canvas-holder").height())
			align = "absolute-center";
		else if (canvasWidth > $(".canvas-holder").width() && canvasHeight < $(".canvas-holder").height())
			align = "absolute-vcenter";
		else if (canvasWidth < $(".canvas-holder").width() && canvasHeight > $(".canvas-holder").height())
			align = "absolute-hcenter";

		if (align != this.state.canvasAlign) this.setState({ canvasAlign: align });
		// this.updateSelection();
	};

	toggleShowGrid = () => {
		this.setState({ showGrid: !this.state.showGrid });
		this.requestCanvasUpdate();
	};

	handleCanvasContextMenu = e => {
		let x = e.clientX;
		let y = e.clientY;
		if (this.state.selection.length == 1) {
			this.refs.assetContextMenu.show(this.state.selection[0], x, y);
		}
		//this.updateSelection();
	};

	/* ----- ITEMS ----- */
	handleSelectItem = (item, cmdKeyDowned=false) => {

		let items;
		if (cmdKeyDowned) {
			if (this.state.selection.includes(item)) {
				items = this.state.selection.filter(selection => {
					return selection != item;
				});
			} else {
                items = [...this.state.selection, item];
			}
			
		} else {
            items = [item];
		}

		if(items.length > 1) {
			this.setState({
				selectionAngle : 0,
				isUpdateForMutiSelect: true
			});
		}


		this.state.selection = items;
		this.setState({ selection: this.state.selection });
		
		var me = this;
		//this.requestCanvasUpdate();
		setTimeout(function () {
			me.updateSelection()
		}, 100);
	};

	clearSelection = () => {
		this.setState({
			selection: [],
			selectionLeft: null,
			selectionTop: null,
			selectionWidth: null,
			selectionHeight: null,
			selectionAngle: 0
		});
	};

	handleFisnishedEditingText = e => {
		if (this.refs.editTextBox.value == "") {
			alert("Text cannot be empty.");
			return;
		}
		var asset = this.state.hoverTarget || this.state.selection[0];
		if (!asset) return;

		var cps = 12.5;
		if (asset.text.length > 0) cps = (asset.text.length * 1000) / asset.animationDuration;

		let direction;
		if(this.refs.editTextRTL.checked) direction = 'rtl';

		asset.text = this.refs.editTextBox.value;
		asset.align = asset.direction != direction ? (direction == 'rtl' ? 'right' : 'left') : asset.align;
		asset.direction = direction;
		asset.animationDuration = Math.round((asset.text.length / cps) * 1000);

		this.refs.editTextModal.hide();

		asset.createImageCache(this.state.zoom, this.state.fullPreviewZoom, this.props.video && this.props.video.style);
		this.state.scene.updateStatus();
	};

	alignTextLeft = e => {
		var asset = this.state.hoverTarget || this.state.selection[0];
		if (!asset) return;

		asset.align = "left";
		asset.createImageCache(this.state.zoom, this.state.fullPreviewZoom, this.props.video && this.props.video.style);
		this.state.scene.updateStatus();
		this.requestCanvasUpdate();
		e.stopPropagation();
	};

	alignTextCenter = e => {
		var asset = this.state.hoverTarget || this.state.selection[0];
		if (!asset) return;

		asset.align = "center";
		asset.createImageCache(this.state.zoom, this.state.fullPreviewZoom, this.props.video && this.props.video.style);
		this.state.scene.updateStatus();
		this.requestCanvasUpdate();
		e.stopPropagation();
	};

	alignTextRight = e => {
		var asset = this.state.hoverTarget || this.state.selection[0];
		if (!asset) return;

		asset.align = "right";
		asset.createImageCache(this.state.zoom, this.state.fullPreviewZoom, this.props.video && this.props.video.style);
		this.state.scene.updateStatus();
		this.requestCanvasUpdate();
		e.stopPropagation();
	};

	updateSceneStatus = event => {
		this.state.scene.updateStatus();
		if (event && (event.action == "change_animation_duration" || event.action == "change_animation_delay"))
			this.state.scene.history.push(event);
	};

	handleEditAsset = () => {
		if (this.props.videoActionListener) {
			this.props.videoActionListener({
				action: "edit_asset",
				data: {
					asset: this.state.selection[0]
				}
			});
		}
	};

	showAssetSettings = e => {
		e.stopPropagation();
		this.refs.assetSettings.show();
	};

	handleApplyAssetSettings = asset => {
		this.state.selection.forEach(asset => {
			asset.createImageCache(this.state.zoom, this.state.fullPreviewZoom, this.props.video && this.props.video.style);
		});
		this.updateSceneStatus();
	};

	handleMoveSelection = (leftOffset, topOffset) => {
		this.state.selection.forEach(asset => {
			asset.x += (leftOffset / this.state.initialCanvasWidth) * this.state.zoom;
			asset.y += (topOffset / this.state.initialCanvasHeight) * this.state.zoom;
		});

		this.state.initialSelectionLeft += leftOffset * this.state.zoom;
		this.state.initialSelectionTop += topOffset * this.state.zoom;
		this.setState({
			initialSelectionLeft: this.state.initialSelectionLeft,
			initialSelectionTop: this.state.initialSelectionTop
		});
		var me = this;
		setTimeout(function(){
			me.requestCanvasUpdate();
			me.updateSelection();
		}, 100);
		// this.requestCanvasUpdate();
		// this.updateSelection();
	};

	/* ----- PREVIEW ----- */
	startPreview = () => {
		Hand.useSet(0);
		this.refs.previewModal.show();
		this.setState({ animationStartTime: Date.now() });
		this.currentAnimation = requestAnimationFrame(this.drawPreview);
	};

	drawPreview = () => {
		if (!this.refs.previewCanvasFull) return;
		
		var animationDuration = _.sum(
				this.state.scene.items.map(item => (item.animationDelay || 0) + item.animationDuration)
			),
			elapsed = Date.now() - this.state.animationStartTime;

		var frame = document.createElement("canvas");
		frame.width = this.refs.previewCanvasFull.width;
		frame.height = this.refs.previewCanvasFull.height;

		this.state.scene.drawPartial(
			frame,
			this.state.fullPreviewZoom,
			elapsed,
			true,
			this.props.video && this.props.video.style,
			true
		);

		var ctx = this.refs.previewCanvasFull.getContext("2d");
		ctx.globalCompositeOperation = "source-over";

		if(this.props.video) {
			if(this.props.video.background.type == Video.BackgroundTypeImage) {
				ctx.drawImage(this.props.video.background.backgroundImage, 0, 0, this.refs.previewCanvasFull.width, this.refs.previewCanvasFull.height);
			} else {
				ctx.fillStyle = this.props.video.background.backgroundColor;
				ctx.fillRect(0, 0, this.refs.previewCanvasFull.width, this.refs.previewCanvasFull.height);
			}
		} else {
			ctx.fillStyle = Video.BackgroundDefaultColor;
			ctx.fillRect(0, 0, this.refs.previewCanvasFull.width, this.refs.previewCanvasFull.height);
		}

		ctx.drawImage(frame, 0, 0);

		if (elapsed < animationDuration) {
			this.elapsed = elapsed;
			this.startingAnimation = setTimeout(() => {
				this.currentAnimation = requestAnimationFrame(this.drawPreview);
			}, 1000 / 30);
		} else {
			delete this.elapsed;
			delete this.currentAnimation;
		}
	};

	pausePreview = () => {
		if (this.startingAnimation) clearTimeout(this.startingAnimation);

		if (this.currentAnimation) {
			cancelAnimationFrame(this.currentAnimation);
			delete this.currentAnimation;
		} else {
			this.setState({ animationStartTime: Date.now() - (this.elapsed || 0) });
			this.currentAnimation = requestAnimationFrame(this.drawPreview);
		}
	};

	handleDismissPreview = () => {
		if (this.currentAnimation) {
			cancelAnimationFrame(this.currentAnimation);
		}
		if (this.startingAnimation) {
			clearTimeout(this.startingAnimation);
			this.startingAnimation = null;
		}
	};

	/* ----- TOOLS ----- */
	handleZoomIn = () => {
		var computedZoom = Math.min(this.state.zoom + this.state.initialZoom * 0.2, this.state.initialZoom * 5);
		var dz = computedZoom - this.state.zoom;
		this.setState({
			zoom: computedZoom,
			initialSelectionWidth: Math.ceil(this.state.initialSelectionWidth * (1 + dz)),
			initialSelectionHeight: Math.ceil(this.state.initialSelectionHeight * (1 + dz)),
			isZoomAction: true
		});

		if (computedZoom != this.state.zoom) {
			this.requestCanvasUpdate();
			setTimeout(() => {
			
				delete this.cachedAsset;
				this.state.scene.updateImageCache(this.state.zoom, 0, this.props.video && this.props.video.style);
				this.requestCanvasUpdate();
				this.updateSelection();
			}, 50);
		}
	};

	handleZoomOut = () => {
		var computedZoom = Math.max(this.state.zoom - this.state.initialZoom * 0.2, this.state.initialZoom / 2);

		var dz = computedZoom - this.state.zoom;
		this.setState({
			zoom: computedZoom,
			initialSelectionWidth: Math.ceil(this.state.initialSelectionWidth * (1 + dz)),
			initialSelectionHeight: Math.ceil(this.state.initialSelectionHeight * (1 + dz)),
			isZoomAction: true
		});
		if (computedZoom != this.state.zoom) {
			this.requestCanvasUpdate();
			setTimeout(() => {
				
				delete this.cachedAsset;
				this.state.scene.updateImageCache(this.state.zoom, 0, this.props.video && this.props.video.style);
				this.requestCanvasUpdate();
				this.updateSelection();
			}, 50);
		}
		
	};

	/* ----- ASSETS ----- */
	assetsIntersect = (asset1, asset2) => {
		var m1 = asset1.measure(this.refs.mainCanvas, this.state.zoom);
		var m2 = asset2.measure(this.refs.mainCanvas, this.state.zoom);

		return !(
			m2.left > m1.left + m1.width ||
			m2.left + m2.width < m1.left ||
			m2.top > m1.top + m1.height ||
			m2.top + m2.height < m1.top
		);
	};

	assetHasContentAt = (asset, x, y) => {
		if (asset.type != "image") return true;

		if (this.cachedAsset != asset) {
			if (!asset.cachedImg) asset.createImageCache(this.state.zoom, 0, this.props.video && this.props.video.style);

			this.canvas = document.createElement("canvas");
			this.canvas.width = asset.cachedImg.width;
			this.canvas.height = asset.cachedImg.height;
		}

		var ctx = this.canvas.getContext("2d");

		if (this.cachedAsset != asset) {
			ctx.drawImage(asset.cachedImg, 0, 0);
			this.cachedAsset = asset;
		}

		if (asset.flipped) x = asset.cachedImg.width - x;

		return ctx.getImageData(x, y, 1, 1).data[3] > 0;
	};

	/* ----- MATH ----- */
	pointInsideRectangle = (rx, ry, rw, rh, angle, x, y) => {
		var angleRad = ((angle || 0) * Math.PI) / 180;
		var dx = x - rx;
		var dy = y - ry;

		// distance between point and centre of rectangle.
		var h1 = Math.sqrt(dx * dx + dy * dy);

		var currA = Math.atan2(dy, dx);

		// angle of point rotated by the rectangle amount around the centre of rectangle.
		var newA = currA - angleRad;

		// x2 and y2 are the new positions of the point when rotated to offset the rectangles orientation.
		var x2 = Math.cos(newA) * h1 + 0.5 * rw;
		var y2 = Math.sin(newA) * h1 + 0.5 * rh;

		if (x2 >= 0 && x2 <= rw && y2 >= 0 && y2 <= rh) return { x: x2, y: y2 };
		return null;
	};

	rotatedRectanglePoint = (rx, ry, rw, rh, angle, x, y) => {
		var angleRad = ((angle || 0) * Math.PI) / 180;
		var dx = x - rx;
		var dy = y - ry;

		// distance between point and centre of rectangle.
		var h1 = Math.sqrt(dx * dx + dy * dy);

		var currA = Math.atan2(dy, dx);

		// angle of point rotated by the rectangle amount around the centre of rectangle.
		var newA = currA + angleRad;

		// x2 and y2 are the new positions of the point when rotated to offset the rectangles orientation.
		var x2 = Math.cos(newA) * h1 + 0.5 * rw;
		var y2 = Math.sin(newA) * h1 + 0.5 * rh;

		return { x: x2, y: y2 };
	};

	/* ----- FONTS ----- */
	cachedFont = path => {
		var index = _.findIndex(this.state.cachedFonts, item => item.path == path);
		if (index >= 0) return this.state.cachedFonts[index].type;
		return null;
	};

	isSelected = () => {
		return this.state.selection.length > 0
	}

    isGroupSelected = () => {
        return this.state.selection.length > 1
    }
}

export default SceneEditor;

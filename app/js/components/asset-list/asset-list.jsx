import React from 'react'
import ReactDOM from 'react-dom'
import PropTypes from 'prop-types'
import $ from 'jquery'
import _ from 'lodash'

_.mixin(require('inflection'))

import SearchBox from './search-box.jsx'
import AssetItem from './asset-item.jsx'
import CircleButton from '../common/circle-button.jsx'
import UploadBox from '../common/upload-box.jsx'

import AssetContextMenu from './asset-context-menu.jsx'

class AssetList extends React.Component {
  static propTypes = {
    fromURL: PropTypes.string.isRequired,
    scope: PropTypes.string.isRequired,
  }

  state = {
    items: [],
    loading: true,
    selectedItem: null,
    done: false
  }

  componentDidMount() {
    this.setState({items: []}, this.loadData);
  }

  componentDidUpdate(prevProps, prevState) {
    if (this.props.fromURL != prevProps.fromURL) {
      this.setState({items: []}, this.loadData);
      this.props.onLoad();
    }
  }

  componentWillUnmount() {
    if (this.request) this.request.abort();
  }

  render() {
    var itemsHTML;
    let isMembership = _.find(this.props.user.products, {type: 'DOODLY_GOLD'}) || _.find(this.props.user.products, {type: 'DOODLY_GOLD_YRLY'}) ||
                      _.find(this.props.user.products, {type: 'DOODLY_PLATINUM'}) || _.find(this.props.user.products, {type: 'DOODLY_PLATINUM_YRLY'}) ||
                      _.find(this.props.user.products, {type: 'DOODLY_ENTERPRISE'}) || _.find(this.props.user.products, {type: 'DOODLY_ENTERPRISE_YRLY'});

    if (this.state.items.length) {
      itemsHTML = this.state.items.map(function(item){
                    return (
                      <AssetItem
                        item={item}
                        key={item.id}
                        ref={`assetItemElement${item.id}`}
                        onDoubleClick={this.handleItemDoubleClick.bind(this, item)}
                        onClick={this.handleItemClick.bind(this, item)}
                        selected={item === this.state.selectedItem}
                        draggable={this.props.mode == 'scene' || ( this.props.mode == 'template' && this.props.assetType != 'template')}
                        onContextMenu={this.handleAssetContextMenu.bind(this, item)}
                        forMembership={isMembership || false}
                        />
                    )
                  }, this);
    } else if (!this.state.loading) {
      itemsHTML = <div className="no-results">Nothing found...</div>;
    }

    return (
      <div className={'asset-list flex column stretch ' + this.props.scope.toLowerCase()}>
        {
          ['Characters', 'Props', 'Sounds'].indexOf(this.props.scope) != - 1 &&
          <SearchBox
            onSearch={this.handleSearchBoxInput}
            onFilter={this.handleSearchBoxFilter}
            {...this.props}
            />
        }
        <div className="items" ref="items" onScroll={this.handleScroll}>
          <div className="flex wrap">{itemsHTML}</div>
          <div className="text-center"><i className={this.state.loading ? 'spinner fa fa-lg fa-refresh fa-spin' : ''}/></div>
        </div>
        { (this.props.inManager || (['Characters', 'Props', 'Sounds', 'Text'].indexOf(this.props.scope) != -1 && this.props.video)) &&
          <div>
            <CircleButton className="add" onClick={this.props.scope != 'Templates' ? this.showUploadBox : this.addItem}>
              <i className="fa fa-2x fa-plus"/>
            </CircleButton>
            <UploadBox scope={this.props.scope} ref="uploadBox" onUploadCompleted={this.handleUploadedAsset} {...this.props}/>
          </div>
        }
        <AssetContextMenu ref="assetContextMenu" actionListener={this.handleAction} />
      </div>
    );
  }

  loadData = () => {
    let startOver = this.state.searchFor != this.state.prevSearchFor || this.state.searchFilter != this.state.prevSearchFilter;

    this.setState({loading: true});

    var url = server_url + this.props.fromURL +
      (this.props.fromURL.indexOf('?') == -1 ? '?' : '&') +
      ('skip=' + (startOver ? 0 : this.state.items.length) ) +
      (this.state.searchFor ? '&searchFor=' + this.state.searchFor : '') +
      (this.state.searchFilter ? '&filter=' + this.state.searchFilter : '') +
      '&count=25' +
      (this.props.inManager ? '&all=true' : '');
      
    this.request = $.get(url)
      .done((data) => {
        if (!this.request) return;

        if (this.props.assetType)
          data.forEach(item => item.type = this.props.assetType);

        this.setState({
          items: startOver ? data : _.uniqBy(this.state.items.concat(data), 'id'),
          loading: false,
          done: data.length < 25,
          prevSearchFor: this.state.searchFor,
          prevSearchFilter: this.state.searchFilter
        });

        delete this.pending;
        delete this.request;
      })
      .fail((request, textStatus, error) => this.props.handleAjaxFail(request, this.loadData));
  }

  reload = () => {
    this.setState({
      items: [],
      selectedItem: null
    });
    this.loadData();
  }

  showUploadBox = () => {
    this.refs.uploadBox.reset();
    this.refs.uploadBox.show();
  }

  handleUploadedAsset = (asset) => {
    // add the asset to the item list
    this.state.items.unshift(asset);
    $('.items', $(ReactDOM.findDOMNode(this))).scrollTop(0);

    this.handleItemClick(asset);

    // trigger onAssetAdded in order to change the category if needed
    if (this.props.onAssetAdded) {
      this.props.onAssetAdded(asset);
    }
  }

  addItem = () => {
    if (this.props.assetType == 'template') {
      $.post(server_url + '/templates', {empty: true})
        .done((data) => {
          var item = data;
          item.type = 'template';
          this.state.items.unshift(item);
          this.forceUpdate();
          this.handleItemClick(item);
        })
        .fail((request, textStatus, error) => this.props.handleAjaxFail(request, this.addItem));
    }
  }

  handleItemClick = (item) => {
    this.setState({selectedItem: item});
    if (item.type == 'template') {
      item.onClose = this.handleItemClose;
    }
    if (this.props.onItemClick) {
      item.onStatusChange = this.handleItemStatusChange;
      this.props.onItemClick(item);
    }
  }

  handleItemDoubleClick = (item) => {
    if (this.hasAssetOwnership(item)) {
      this.renameAssetStart(item.id);
    }
  }

  handleItemStatusChange = () => {
    if (this.state.selectedItem.type == 'image' || this.state.selectedItem.type == 'font' || this.state.selectedItem.type == 'sound') {
      if (this.state.selectedItem.status == 'inactive') {
        this.setState({
          items: this.state.items.filter((item) => item != this.state.selectedItem),
          selectedItem: null
        });
        if (this.props.onItemClick) {
          this.props.onItemClick(null);
        }
      }
    } else
    if (this.state.selectedItem.type == 'template') {
      if (this.state.selectedItem.status && this.state.selectedItem.status == 'deleted') {
        this.setState({
          items: this.state.items.filter((item) => item != this.state.selectedItem),
          selectedItem: null
        });
        if (this.props.onItemClick) {
          this.props.onItemClick(null);
        }
      }
    }
    this.forceUpdate();
  }

  handleItemClose = () => {
    if (this.props.onItemClick) {
      this.props.onItemClick(null);
    }
  }

  handleAction = (action) => {

    if (typeof action == 'object') {
      var data = action.data;
      var action = action.action;
    };

    switch (action) {
      case 'delete_asset':
        this.deleteAsset(data.assetID);
        break;
      case 'rename_asset':
        this.renameAssetStart(data.assetID);
        break;  
      default:
        break;
    }
  }

  deleteAsset = (assetID) => {
    confirm('Are you sure you want to delete this asset? This action is not reversible.\nThe asset will no longer be available outside the scenes that already use it.')
    .then(() => {
      this.setState({
        items: this.state.items.filter(item => item.id != assetID)
      });

      $('.toast').html('Deleting asset...').fadeIn(500);
      $.ajax({
        url: server_url + '/assets/' + assetID,
        method: 'PUT',
        data: {status: 'inactive'}
      })
        .always(() => {
          $('.toast').fadeOut();
        });
    })
  }

  renameAssetStart = (assetID) => {
    var itemElement = this.refs[`assetItemElement${assetID}`];
    if(itemElement) {
      itemElement.handleChangeTitleStart();
    }
  }

  handleScroll = () => {
    var scrollTop = $(this.refs.items).scrollTop();
    var itemsHeight = this.state.items.length / (['Characters', 'Props'].indexOf(this.props.scope) != -1 ? 3 : 1) * this.getAssetHeight();
    var containerHeight = $(this.refs.items).height();

    if (!this.pending && !this.state.loading && !this.state.done &&  scrollTop > (itemsHeight - containerHeight - 100)) {
      this.pending = true;
      this.loadData();
    }
  }

  handleSearchBoxInput = (value) => {
    if (this.request) {
      this.request.abort();
      delete this.request;
    }

    this.setState({
      searchFor: value,
      items: this.state.items.filter((item) => item.title.toLowerCase().indexOf(value.toLowerCase()) != -1)
    });
    requestAnimationFrame(this.loadData);
  }

  handleSearchBoxFilter = (filter) => {
    if (this.request) {
      this.request.abort();
      delete this.request;
    }

    this.setState({
      searchFilter: filter,
      items: filter == 'PRO' ?
          this.state.items.filter(item => item.is_pro)
        :
          filter == 'DOODLY_CLUB' ?
            this.state.items.filter(item => item.is_club)
          :
            this.state.items
    });

    requestAnimationFrame(this.loadData);
  }

  handleAssetContextMenu = (item, event) => {
    let x = event.clientX - $(this.refs.items).offset().left + $(this.refs.items).position().left;
    let y = event.clientY - $(this.refs.items).offset().top + $(this.refs.items).position().top;
    if (this.hasAssetOwnership(item)) {
      this.refs.assetContextMenu.show(item.id, x, y);
    }
  }

  hasAssetOwnership = (item) => {
    if (this.props.user.id > 1 && this.props.user.id == item.user_id) {
      return true;
    } else {
      return false;
    }
  }

  getAssetHeight = () => {
    switch (this.props.scope) {
      case 'Templates':
        return 180;
      case 'Characters':
        return 150 + 45;
      case 'Text':
        return 60;
      case 'Sounds':
        return 80;
      default:
        return 100 + 30;
    }
  }
}

export default AssetList

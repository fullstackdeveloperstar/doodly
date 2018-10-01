import React from 'react'
import PropTypes from 'prop-types'
import _ from 'lodash'

import Categories from './categories.jsx'
import AssetList from '../asset-list/asset-list.jsx'

const tabs = [
  {name: 'Scenes', value: 'Templates'},
  {name: 'Characters'},
  {name: 'Props'},
  {name: 'Text'},
  {name: 'Sounds'}
]

class Sidebar extends React.Component {
  static propTypes = {
    onItemClick: PropTypes.func.isRequired
  }

  state = {
    selectedTab: 0,
    selectedCategories: [],
    categoriesVisible: [],
  }

  render() {
    return (
      <div className="left-sidebar flex stretch">
        <div className="tabs flex">
          {tabs.map(function(tab, i){
            return (
              <div key={i} className={'tab fill' + (i == this.state.selectedTab ? ' active' : '' )} onClick={this.selectTab.bind(this,i)}>{tab.name}</div>
            );
          }, this)}
        </div>
        <div className="pages flex stretch">
          {tabs.map(function(tab,i){
            var scope = tab.value || tab.name;
            var assetType = null;
            var path = '/assets?categ=' + scope;
            if (scope == 'Templates') {
              path = '/templates';
              assetType = 'template';
            } else if (this.state.selectedCategories[scope]) {
              if (this.state.selectedCategories[scope] != -1)
                path = '/assets?categ_id=' + this.state.selectedCategories[scope];
              else
                path = '/assets?categ=' + scope + '&from_library=true';
            }

            var categories;
            if (['Templates', 'Text'].indexOf(scope) == -1) {
              categories = <Categories
                  parentCategory={scope}
                  visible={this.state.categoriesVisible[i] || false}
                  selectedCategory={this.state.selectedCategories[scope] || scope}
                  onSelectCategory={this.selectCategory.bind(this, scope)}
                  {...this.props}
                />
            }

            return (
              <div key={i} className={'page flex stretch' + (i == this.state.selectedTab ? ' visible' : '' )}>
                <AssetList
                  scope={scope}
                  fromURL={path}
                  ref={'asset_list_' + i}
                  onLoad={this.pageLoaded.bind(this, i)}
                  onAssetAdded={this.onAssetAdded}
                  assetType={assetType}
                  {...this.props}
                />
                { categories }
              </div>
            )
          }, this)}
        </div>
      </div>
    );
  }

  selectTab = (i) => {
    this.setState({selectedTab: i});
  }

  selectCategory = (tab, id) => {
    var selectedCategories = this.state.selectedCategories;
    if (id != tab) {
      selectedCategories[tab] = id;
    } else {
      selectedCategories[tab] = null;
    }
    this.setState({selectedCategories: selectedCategories});
  }

  pageLoaded = (i) => {
    var categoriesVisible = this.state.categoriesVisible;
    categoriesVisible[i] = false;
    this.setState({categoriesVisible: categoriesVisible});
  }

  onAssetAdded = (asset) => {
    var tab = tabs[this.state.selectedTab];
    if (this.state.selectedCategories[tab] &&
      this.state.selectedCategories[tab] != asset.categ_id) {
        this.selectCategory(tab, asset.categ_id);
      }
  }


  reloadActiveTab = () => {
    this.refs['asset_list_' + this.state.selectedTab].reload();
  }

}

export default Sidebar

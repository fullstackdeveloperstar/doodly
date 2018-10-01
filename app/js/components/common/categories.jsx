import React from 'react'
import ReactDOM from 'react-dom'
import PropTypes from 'prop-types'
import $ from 'jquery'
import Cache from '../../cache.js'

class Categories extends React.Component {
  static propTypes = {
    parentCategory: PropTypes.string.isRequired,
    visible: PropTypes.bool.isRequired,
    selectedCategory: PropTypes.any.isRequired,
    onSelectCategory: PropTypes.func.isRequired
  }

  state = {
    items: [],
    visible: false
  }

  componentDidMount() {
    this.load();
  }

  componentWillUpdate(nextProps, nextState) {
    if (nextProps && this.state.visible != nextProps.visible) {
      this.toggleVisible();
    }
  }

  componentWillUnmount() {
    if (this.request) this.request.abort();
  }

  render() {
    return (
      <div className={'categories ' + (this.state.visible ? 'visible' : '')} onClick={this.toggleVisible}>
        <i className="toggle fa fa-angle-double-left" onClick={this.toggleVisible}/>
        <h4>Categories</h4>
          <div className={'category' + (this.props.parentCategory == this.props.selectedCategory ? ' selected' : '')} key={this.props.parentCategory} onClick={this.selectCategory.bind(this, this.props.parentCategory)}>
            All
          </div>
          {['Characters', 'Props', 'Sounds'].indexOf(this.props.parentCategory) != -1 && this.props.video &&
            <div className={'category' + (this.props.selectedCategory == -1 ? ' selected' : '')} key={-1} onClick={this.selectCategory.bind(this, -1)}>
              My&nbsp;Library
            </div>
          }
        {this.state.items.map(function(category){
          return (
            <div className={'category' + (category.id == this.props.selectedCategory ? ' selected' : '')} key={category.id} onClick={this.selectCategory.bind(this, category.id)}>
              {category.name}
            </div>
          )
        }, this)}
      </div>
    );
  }
  

  load = () => {
    if (this.props.parentCategory) {
      var categories = Cache.get('categories', this.props.parentCategory);
      if (categories) {
        this.setState({items: categories})
      } else
      this.request = $.get(server_url + '/categories/' + this.props.parentCategory + '/subcategories')
       .done((data) => {
         this.setState({items: data});
         Cache.putSub('categories', this.props.parentCategory, data);
       })
       .fail((request, textStatus, error) => this.props.handleAjaxFail(request, this.load));
    }
  }

  toggleVisible = () => {
    this.setState({visible: !this.state.visible});
  }

  selectCategory = (categ_id) => {
    this.props.onSelectCategory(categ_id);
  }

}

export default Categories

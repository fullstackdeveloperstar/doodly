import React from 'react'
import PropTypes from 'prop-types'
import ReactDOM from 'react-dom'
import $ from 'jquery'
import _ from 'lodash'

import SearchFilters from './search-filters.jsx'

class SearchBox extends React.Component {
  static propTypes = {
    onSearch: PropTypes.func.isRequired
  }

  state = {
    inputValue: '',
    canFilterPRO: false,
    canFilterClub: false
  }

  componentDidMount() {
    this.updateState();
  }

  componentDidUpdate(prevProps, prevState) {
    if (prevProps != this.props)
    this.updateState();
  }

  render() {
    return (
      <div className="search-box flex wrap">
        <input ref="input" type="text" className="fill" onKeyUp={this.search} placeholder="Search for..."></input>
        <button className="btn clear reset" onClick={this.clear} disabled={this.state.inputValue == ''}><i className="fa fa-times-circle red"/></button>
        {(this.state.canFilterPRO || this.state.canFilterClub || this.props.inManager) &&
          <button className="btn default sm" ref="showFilters" onClick={this.showFilters} style={{marginLeft: 5, opacity: 0, marginRight: -80}}><i className="fa fa-filter"/> Filters</button>
        }
        {(this.state.canFilterPRO || this.state.canFilterClub || this.props.inManager) &&
          <SearchFilters ref="filters" {...this.props} onHide={this.hideFilters}/>
        }
      </div>
    )
  }

  updateState = () => {
    this.setState({
      canFilterPRO: _.find(this.props.user.products, {type: 'PRO_ASSETS'}),
      canFilterClub: _.find(this.props.user.products, {type: 'DOODLY_CLUB'}) ||
                        _.find(this.props.user.products, {type: 'DOODLY_ENTERPRISE'}) || _.find(this.props.user.products, {type: 'DOODLY_ENTERPRISE_YRLY'}) ||
                        _.find(this.props.user.products, {type: 'DOODLY_PLATINUM'}) || _.find(this.props.user.products, {type: 'DOODLY_PLATINUM_YRLY'})
    })
  }

  search = () => {
    this.setState({inputValue: this.refs.input.value});
    if (this.pending)
      clearTimeout(this.pending);

    this.pending = setTimeout(() => {
      this.props.onSearch(this.refs.input.value);
      delete this.pending;
    }, 200);
  }

  showFilters = () => {
    $(ReactDOM.findDOMNode(this.refs.filters)).slideDown();
    $(this.refs.showFilters).animate({'margin-right': '-=80', 'opacity': '-=1'});
  }

  hideFilters = () => {
    $(ReactDOM.findDOMNode(this.refs.filters)).slideUp();
    $(this.refs.showFilters).animate({'margin-right': '+=80', 'opacity': '+=1'});
  }

  clear = () => {
    this.refs.input.value = '';
    this.search();
  }
}

export default SearchBox

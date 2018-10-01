import React from 'react'
import PropTypes from 'prop-types'
import $ from 'jquery'
import _ from 'lodash'
import dateFormat from 'dateformat'

class SearchFilters extends React.Component {
  static propTypes = {
    onFilter: PropTypes.func.isRequired,
    onHide: PropTypes.func
  }

  state = {
    canFilterPRO: false,
    canFilterClub: false,
    filter: null,
  }
  
  componentDidMount() {
    this.updateState();
    document.addEventListener('click', this.hideDoodlyClubDropdown);
  }

  componentDidUpdate(prevProps, prevState) {
    if (prevProps != this.props)
      this.updateState()
  }

  componentWillUnmount() {
    document.removeEventListener('click', this.hideDoodlyClubDropdown);
  }

  render () {
    return (
      <div className="flex center space-between" style={{marginTop: 10, width: '100%'}}>
        <a href="javascript:;" ref="hideFilters" className="hide-filters" onClick={this.props.onHide}><i className="fa fa-angle-up"/> Hide filters</a>
        <div className="flex center btn-group">
          <button className={'btn sm ' + (this.state.filter ? 'white' : 'default')} onClick={this.setFilter.bind(this, null)}>All</button>
          { (this.state.canFilterPRO || this.props.inManager) &&
            <button className={'btn sm ' + (this.state.filter == 'PRO' ? 'default' : 'white')} onClick={this.setFilter.bind(this, 'PRO')}>PRO</button>
          }
          { (this.state.canFilterClub || this.props.inManager) && ['Characters', 'Props'].indexOf(this.props.scope) != -1 &&
            <button
              className={'btn sm ' + (this.state.filter && this.state.filter.indexOf('DOODLY_CLUB') == 0 ? 'default' : 'white')}
              style={{position: 'relative'}}
              onClick={this.toggleDoodlyClub}>
              <nobr>
                {this.getDoodlyClubLabel()}
                &nbsp;
                <i className="fa fa-angle-down"/>
              </nobr>
              <div className="club_months" ref="clubMonths">
                {this.state.club_months && this.state.club_months.map((month, i) => {
                  return (
                    <div
                      key={i}
                      className={this.state.filter && this.state.filter.substr(12) == month ? 'selected' : ''}
                      onClick={this.setFilter.bind(this, 'DOODLY_CLUB ' + month)}>
                        <nobr>{month}</nobr>
                    </div>
                  )
                })}
              </div>
            </button>
          }
          {
            (!this.props.inManager && ['Characters', 'Props'].indexOf(this.props.scope) != -1) &&
            <button className={'btn sm ' + (this.state.filter && this.state.filter.indexOf('MARKETPLACE') == 0 ? 'default' : 'white')} onClick={this.setFilter.bind(this, 'MARKETPLACE')}>Marketplace</button>
          }
        </div>
      </div>
    )
  }

  updateState = () => {
    let months = ['All months'];
    if (this.props.inManager) {
      var date = new Date('2016/08/01 UTC');
      while (date <= (Date.now()) + 2 * 30 * 24 * 60 * 60 * 1000) {
        months.push(dateFormat(new Date(date), 'mmmm yyyy'));
        date.setMonth(date.getMonth() + 1);
      }
    } else if (this.state.canFilterClub) {
      let sorted_club_months = this.props.user.products.filter(p => p.type == 'DOODLY_CLUB')
        .sort((a, b) => {
          return (new Date(a.created_at)) - (new Date(b.created_at));
        });

      // add purchased months
      sorted_club_months.map(p => {
        months.push(dateFormat(new Date(p.created_at), 'mmmm yyyy'));
      })

      // push current month if last payment was done last month and less than 30 days have past since
      let active_club_months = sorted_club_months.filter(p => p.status == 'active');
      if (active_club_months.length > 0) {
        let last_active = new Date(active_club_months[active_club_months.length - 1].created_at);
        if (last_active.getMonth() < (new Date()).getMonth() && Math.round((Date.now() - last_active) / 8.64e7) <= 30) {
          months.push(dateFormat(Date.now(), 'mmmm yyyy'));
        }
      }
    }

    let purchasesIncludingClub = this.props.user.products.filter(product => {
      return ['DOODLY_PLATINUM', 'DOODLY_PLATINUM_YRLY', 'DOODLY_ENTERPRISE', 'DOODLY_ENTERPRISE_YRLY'].indexOf(product.type) != -1 && product.status == 'active'
    });
    purchasesIncludingClub.forEach(purchase => {
      let purchaseDate = new Date('2016-09-01');
      let endDate = purchase.status == 'active' ? Date.now() : new Date(purchase.updated_at);
      while (purchaseDate <= endDate) {
        let month = dateFormat(purchaseDate, 'mmmm yyyy');

        if (months.indexOf(month) == -1)
          months.push(month);

        purchaseDate.setMonth(purchaseDate.getMonth() + 1);
      }
    });

    this.setState({
      canFilterPRO: _.find(this.props.user.products, {type: 'PRO_ASSETS'}),
      canFilterClub: _.find(this.props.user.products, {type: 'DOODLY_CLUB'}) || purchasesIncludingClub.length > 0,
      club_months: months
    })
  }

  toggleDoodlyClub = (e) => {
    if (e)
      e.nativeEvent.stopImmediatePropagation();

    if ($(this.refs.clubMonths).is(':visible'))
      $(this.refs.clubMonths).slideUp(200);
    else
      $(this.refs.clubMonths).slideDown(200);

  }

  hideDoodlyClubDropdown = (e) => {
    if ($(this.refs.clubMonths).is(':visible'))
      $(this.refs.clubMonths).slideUp(200);
  }

  setFilter = (filter) => {
    this.setState({filter: filter});
    if (this.props.onFilter)
      this.props.onFilter(filter);
  }

  getDoodlyClubLabel = () => {
    if (this.state.filter && this.state.filter.indexOf('DOODLY_CLUB') == 0)
      if (this.state.filter == 'DOODLY_CLUB All months')
        return 'Club'
      else
        return this.state.filter.substr(12);
    return 'Club';
  }
}

export default SearchFilters

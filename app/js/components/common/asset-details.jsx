import React from 'react'

import $ from 'jquery'
import _ from 'lodash'
import dateFormat from 'dateformat'

import Cache from '../../cache.js'
import Modal from './modal.jsx'

class AssetDetails extends React.Component {
  state = {
    categories: []
  }

  componentDidMount() {
    this.update();
  }

  componentDidUpdate(prevProps, prevState) {
    if (this.props.item.id != prevProps.item.id)
      this.update();
  }

  render() {
    return (
      <Modal ref="modal" className="asset-details" title={(this.props.item.type == 'sound' ? 'Audio' : 'Asset') + ' details'}>
        <div className="row">
          <label>Title:</label>
          <input type="text" ref="title"/>
        </div>
        { this.state.categories.length > 0 &&
          <div className="row">
            <label htmlFor="categ_id">Category:</label>
              <div className="pretty-select ">
                <select name="categ_id" ref="categorySelect">
                  {this.state.categories.map(category => {
                    return (
                      <option value={category.id} key={category.id}>{category.name}</option>
                    )
                  })}
                </select>
              </div>
          </div>
        }
        { this.props.inManager &&
          <div className="row">
            <label>Settings:</label>
            <div className="settings flex space-between">
              <div style={{color: '#ff6600', fontWeight: 'bold'}}><input type="checkbox" name="is_pro" ref="isPro"/> PRO</div>
              <div>
                <input type="checkbox" name="is_club" ref="isClub"/> Doodly Club
                <div className="pretty-select" style={{marginTop: 5}}>
                  <select name="month" ref="clubMonth">
                    { this.state.months &&
                      this.state.months.map((month, index) => {
                        return (
                          <option value={dateFormat(month, "yyyy-mm")} key={index}>
                            {dateFormat(month, "mmmm yyyy")}
                          </option>
                        )
                      })
                    }
                  </select>
                </div>
              </div>
            </div>
          </div>
        }
        {
          this.props.inManager &&
          <div className="row">
            <label>Membership:</label>
            <div className="settings flex center space-between">
              <div className="flex center"><input type="checkbox" name="is_gold" ref="isGold"/>&nbsp;Gold</div>
              <div className="flex center"><input type="checkbox" name="is_platinum" ref="isPlatinum"/>&nbsp;Platinum</div>
              <div className="flex center"><input type="checkbox" name="is_enterprise" ref="isEnterprise"/>&nbsp;Enterprise</div>
            </div>
          </div>
        }
        <div className="footer text-right">
          <button className="btn success" onClick={this.save}>&nbsp;&nbsp;&nbsp;Save&nbsp;&nbsp;&nbsp;</button>
        </div>
      </Modal>
    );
  }

  update = () => {
    this.reset();

    var categories = $.map(Cache.get('categories'), (value, index) => [value]);
    _.each(categories, subcategories => {
      if (_.find(subcategories, {id: this.props.item.categ_id}))
        this.setState({categories: subcategories});
    });

    // make a list of months for which the DOODLY_CLUB was / will be available
    let months = [];
    let date = new Date('2016/08');
    var end_date = new Date();
    end_date.setMonth(end_date.getMonth() + 2);

    while (date <= end_date) {
      months.push(new Date(dateFormat(date, 'yyyy-mm')));
      date.setMonth(date.getMonth() + 1);
    }
    this.setState({months: months});

    if (this.refs.isPro)
      requestAnimationFrame(() => {
        if (this.state.categories.length > 0)
          this.refs.categorySelect.value = this.props.item.categ_id;

        this.refs.title.value = this.props.item.title;
        this.refs.isPro.checked = this.props.item.is_pro;
        this.refs.isClub.checked = this.props.item.is_club;
        this.refs.clubMonth.value = dateFormat(this.props.item.club_month ? new Date(this.props.item.club_month) : Date.now(), 'yyyy-mm');
        this.refs.isGold.checked = this.props.item.is_gold;
        this.refs.isPlatinum.checked = this.props.item.is_platinum;
        this.refs.isEnterprise.checked = this.props.item.is_enterprise;
      })
  }

  reset = () => {
    this.setState({categories: []});
  }

  show = () => {
    this.refs.modal.show();
  }

  save = () => {
    this.props.item.title = this.refs.title.value != '' ? this.refs.title.value : 'No title';
    if (this.refs.categorySelect)
      this.props.item.categ_id = this.refs.categorySelect.value;
    if (this.refs.isPro)
      this.props.item.is_pro = this.refs.isPro.checked;

    if (this.refs.isClub) {
      this.props.item.is_club = this.refs.isClub.checked;
      this.props.item.club_month = this.refs.clubMonth.value;
    }

    if (this.refs.isGold)
      this.props.item.is_gold = this.refs.isGold.checked;
    if (this.refs.isPlatinum)
      this.props.item.is_platinum = this.refs.isPlatinum.checked;
    if (this.refs.isEnterprise)
      this.props.item.is_enterprise = this.refs.isEnterprise.checked;

    this.props.assetActionListener('save_details');
    this.refs.modal.hide();
  }

}

export default AssetDetails

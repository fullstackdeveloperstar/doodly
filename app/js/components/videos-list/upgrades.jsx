import React from 'react'
import PropTypes from 'prop-types'
const {shell} = window.require('electron')

const Upgrades = (props) => {
  
  const {user} = props

  return (
    <div>
      {
        user.hasMembership() ?
          <div className="flex">
            {
              !user.hasMembershipPlatinum() && !user.hasMembershipEnterprise() &&
              <div className="upgrade membership flex column center">
                <img src="images/logo_platinum.png"/>
                <p><b>Need more characters<br/>and props?</b><br/>Upgrade to Platinum, Get 750 new characters, 1,100 new props, AND receive 2 NEW characters with 40 poses each and 50 new props every month!</p>
                <button className="btn orange" style={{marginTop: 'auto'}} onClick={() => {shell.openExternal('http://doodly.com/pricing/')}}>Upgrade to Platinum</button>
              </div>
            }
            {
              !user.hasMembershipEnterprise() && (
                user.hasMembershipPlatinum() ?
                  <div className="upgrade membership flex column center">
                    <img src="images/logo_enterprise_new.png"/>
                    <p><b>Looking to use Doodly For Your Clients?</b><br/>Doodly Enterprise allows you to sell/use the videos you create as your own for your clients and customers. Upgrade and start selling today!</p>
                    <button className="btn default" onClick={() => {shell.openExternal('http://doodly.com/pricing/')}}>Upgrade to Enterprise</button>
                  </div>
                :
                  <div className="upgrade membership flex column center">
                    <img src="images/logo_enterprise_new.png"/>
                    <p><b>Ready to use Doodly For Your Clients?</b><br/>Doodly Enterprise Package gives you the license to sell/use videos created by Doodly as your own! Plus you&#39;ll get all the benefits of the Platinum Package as well!</p>
                    <button className="btn default" onClick={() => {shell.openExternal('http://doodly.com/pricing/')}}>Upgrade to Enterprise</button>
                  </div>
              )
            }
          </div>
        :
          (
            user.hasPro() && user.hasEnterprise() && !user.hasClub() ?
              <div className="upgrades">
                {
                  !user.hasClub() &&
                  <div className="upgrade flex column center">
                    <img src="images/logo_club_new.png"/>
                    <p>Can we give you 2 New Characters And 50 New Props <br/>a Month?</p>
                    <button className="btn green" onClick={() => {shell.openExternal('http://doodly.com/club')}}>JOIN Doodly Club</button>
                  </div>
                }
              </div>
            :
              <div className="flex">
                {
                  !user.hasPro() &&
                  <div className="upgrade membership flex column center">
                    <img src="images/logo_platinum.png"/>
                    <p><b>Need more characters<br/>and props?</b><br/>Upgrade to Platinum, Get 750 new characters, 1,100 new props, AND receive 2 NEW characters with 40 poses each and 50 new props every month!</p>
                    <button className="btn orange" style={{marginTop: 'auto'}} onClick={() => {shell.openExternal('http://doodly.com/pricing/')}}>Upgrade to Platinum</button>
                  </div>
                }
                {
                  !user.hasEnterprise() &&
                  <div className="upgrade membership flex column center">
                    <img src="images/logo_enterprise_new.png"/>
                    <p><b>Ready to use Doodly For Your Clients?</b><br/>Doodly Enterprise Package gives you the license to sell/use videos created by Doodly as your own! Plus you&#39;ll get all the benefits of the Platinum Package as well!</p>
                    <button className="btn default" onClick={() => {shell.openExternal('http://doodly.com/pricing/')}}>Upgrade to Enterprise</button>
                  </div>
                }
              </div>
          )

      }
    </div>
  )
}

Upgrades.propTypes = {
  user: PropTypes.object.isRequired
}

export default Upgrades

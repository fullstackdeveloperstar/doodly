export default class User {
  constructor(data) {
    this.id = data.id;
    this.email = data.email;
    this.level = data.level;
    this.name = data.name;
    this.products = data.products;
  }

  activeProducts() {
    return this.products.filter(p => p.status == 'active')
  }

  hasPro() {
    return this.products.find(p => p.type == 'PRO_ASSETS');
  }

  hasEnterprise() {
    return this.products.find(p => p.type == 'DEVELOPER_LICENSE');
  }

  hasClub() {
    let club_months = this.activeProducts().filter(p => p.type == 'DOODLY_CLUB')
      .sort((a, b) => { return (new Date(a.created_at)) - (new Date(b.created_at)) });

    if (club_months.length > 0) {
      let last_active = new Date(club_months[club_months.length - 1].created_at);
      if (last_active.getMonth() == (new Date()).getMonth() || Math.round((Date.now() - last_active) / 8.64e7) <= 30)
        return true;
    }

    return false;
  }

  hasMembershipGold() {
    return this.activeProducts().find(p => p.type == 'DOODLY_GOLD') || this.activeProducts().find(p => p.type == 'DOODLY_GOLD_YRLY');
  }

  hasMembershipPlatinum() {
    return this.activeProducts().find(p => p.type == 'DOODLY_PLATINUM') || this.activeProducts().find(p => p.type == 'DOODLY_PLATINUM_YRLY');
  }

  hasMembershipEnterprise() {
    return this.activeProducts().find(p => p.type == 'DOODLY_ENTERPRISE') || this.activeProducts().find(p => p.type == 'DOODLY_ENTERPRISE_YRLY');
  }

  hasMembership() {
    return this.hasMembershipGold() || this.hasMembershipPlatinum() || this.hasMembershipEnterprise();
  }

  hasUpgrades() {
    return this.hasMembership() ?
      !this.hasMembershipPlatinum() || !this.hasMembershipEnterprise() :
      !this.hasPro() || !this.hasEnterprise() || !this.hasClub();
  }
}

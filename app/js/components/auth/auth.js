var $ = require('jquery');

var Auth = {
  login: function(email, password, listener) {
    $.post(server_url + '/auth',
        {
          email: email,
          password: password
        }
      )
      .done(function(data){
        localStorage.setItem('token', 'Bearer ' + data);
        $.ajaxSetup({headers: {'Authorization': localStorage.token}});

        if (listener)
          listener('load_user_details');
      })
      .fail(function(response){
        console.log(response);
        var data = response.responseJSON;
        if (data) {
          if (data.error == 'invalid_credentials')
            alert('The entered login details are incorrect.');
        } else {
          alert('There has been a problem trying to access the Doodly server. Please contact support, and let us know about this issue. Thank you.');
        }
      });
  }
}

module.exports = Auth;

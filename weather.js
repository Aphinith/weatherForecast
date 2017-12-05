var API_KEY = '6ea7cf3bc006012f';

$(document).ready(function() {

  // function to extract query from url
  function getUrlVars() {
    var vars = [], hash;
    var hashes = window.location.href.slice(window.location.href.indexOf('?') + 1).split('&');
    for(var i = 0; i < hashes.length; i++)
    {
        hash = hashes[i].split('=');
        vars.push(hash[0]);
        vars[hash[0]] = hash[1];
    }
    return vars;
  }

  var location = getUrlVars()['zip_code'];
  var date = getUrlVars()['date'];
  // create a variable to decide if we should request forecast, query values will determine this
  var checkValidationResult = validateQuery(location, date);
  var requestForecast = checkValidationResult[0];
  date = checkValidationResult[1];

  // if validation passes, then we can proceed to get info from api
  if (requestForecast) {
    // send get request to wunderground api to retrieve the 
    $.ajax({
        "url": 'http://api.wunderground.com/api/' + API_KEY + '/forecast10day/q/' + location + '.json',
        "method": 'get',
        "async": true
    }).done(function(data) {
        // if we successfully received a response back, but the query resulted in no city found
        // then we can also just return from this statement and not render anything
        if (data.response.error) {
          return;
        }
        // once we make it here, we know for sure a location exists, let's get the location name and insert it in the DOM
        getLocationName(location);
        // extract the forecast data and begin the process to render it onto DOM
        forecast = data.forecast.simpleforecast.forecastday;
        // create our own list of forecast objects for the values we only want from the returned data
        forecastArray = createForecastArray(forecast);
        // use the forecastArray to just get the dates we want, which is the date from the query and the following two days if they exist
        forecastDates = getRequestedForecastDates(forecastArray, date);
        // now render the forecast onto the page
        renderForecast(forecastDates, date);
    }
    ).fail(function(data) {
        console.log('failed -- do nothing');
    });
  }

  // get location name and get it ready to display with forecast
  function getLocationName(location) {
    $.ajax({
        "url": 'http://api.wunderground.com/api/6ea7cf3bc006012f/geolookup/q/' + location + '.json',
        "method": 'get',
        "async": true
    }).done(function(data) {
        var locationCity = data.location.city;
        var locationState = data.location.state;
        var locationName = locationCity.toUpperCase() + ', ' + locationState;
        // insert location name into DOM
        $('.location').text('WEATHER FORECAST FOR '+ locationName);
    }
    ).fail(function(data) {
        console.log('failed -- do nothing')
        // since this is a separate call that was done after the first call to the weather api
        // there is still a chance that the first call will continue to succeed and this one will fail
        // in the event this fails, we do not want to render anything -- we can prevent any rendering by simply
        // removing everything from the body
        $('body').empty();
    });
  }

  // below are all the helper functions to do validation, create the tags to render onto the dom, etc.

  function createForecastArray (forecast) {

    var forecastArray = [];
    // iterate through the forecast to create the forecastObj of only what we want
    for (var i = 0; i < forecast.length; i++) {
      // get values of only the things we want
      var date = forecast[i].date.month + '/' + forecast[i].date.day + '/' + forecast[i].date.year;
      var weekday = forecast[i].date.weekday;
      var iconUrl = forecast[i].icon_url;
      // for this specific exercise, we want to use icon set 7 so we'll need to update the url
      var iconUrlSet7 = iconUrl.split('/');
      iconUrlSet7[5] = 'g';
      iconUrl = iconUrlSet7.join('/');
      var conditions = forecast[i].conditions;
      var high = forecast[i].high.fahrenheit;
      var low = forecast[i].low.fahrenheit;
      forecastArray.push({'date': date,
                          'weekday': weekday,
                          'iconUrl': iconUrl,
                          'conditions': conditions,
                          'high': high,
                          'low': low})
    }

    return forecastArray;
  }

  function getRequestedForecastDates(forecastArray, date) {

    var requestedDates = [];
    // iterate through the forecastArray and check to see if there is a date match
    // if there is, push it into requestedDates array along with the following two days if it exists
    for (var i = 0; i < forecastArray.length; i++) {
      if (forecastArray[i].date === date) {
        // now push it into the requested dates
        requestedDates.push(forecastArray[i]);
        // now push the next two dates if they exist;
        if (forecastArray[i + 1] !== undefined) {
          requestedDates.push(forecastArray[i + 1]);
        }
        if (forecastArray[i + 2] !== undefined) {
          requestedDates.push(forecastArray[i + 2]);
        }
        // once we have pushed our desired dates, we can just break out of the loop
        break;
      }
    }

    return requestedDates;
  }

  function renderForecast(forecast, date) {
    // check to see if there are any forecasts to render, if none, then do not show anything on the page
    if (forecast.length === 0) {
      return;
    }
    // if we get here, there are forecasts to show, so we want to show the location as well
    $('.location').css('visibility', 'visible');
    // now iterate through the requested forecast and render them onto page the page
    for (var i = 0; i < forecast.length; i++) {
      renderThisForecast(forecast[i]);
    }
  }

  function renderThisForecast(singleForecast) {
    var weekday = singleForecast.weekday;
    var conditions = singleForecast.conditions;
    var high = singleForecast.high;
    var low = singleForecast.low;
    var iconUrl = singleForecast.iconUrl;
    // if the date is for the current date, we want to change the weekday variable to the string value 'today'
    var todaysDate = new Date(Date.now()).toLocaleString();
    todaysDate = todaysDate.split(',')[0];
    if (todaysDate === singleForecast.date) {
      weekday = 'Today';
    }
    // now we need to grab the template from the DOM, clone it, and then insert all of the above variables 
    // into their corresponding elements
    var forecast = $('.forecast-container-template').clone().removeClass('forecast-container-template').addClass('forecast-container');
    var weekdayTag = forecast.find('.weekday');
    $(weekdayTag).text(weekday + ':');
    var iconTag = forecast.find('.icon-url');
    $(iconTag).attr('src', iconUrl);
    var conditionsTag = forecast.find('.conditions');
    $(conditionsTag).text(conditions);
    var highTag = forecast.find('.high');
    highTag.text(high + '\xB0');
    var lowTag = forecast.find('.low');
    lowTag.text(low + '\xB0' + ' F');
    // now append the forecast to the main div on page
    $('.main').append(forecast);
  }

  // check the query values to determine if we should proceed with sending a call to the weather api
  function validateQuery(location, date) {
    // if location is not a 5 character integer value, then it is not valid and return false
    if (isNaN(Number(location)) || location.length !== 5 || date === '') {
      return [false, ''];
    }

    // if date is not in the correct format, then it is not valid and return false
    var dateCheck = date.split('/');
    if (isNaN(Number(dateCheck[0])) || isNaN(Number(dateCheck[1])) || isNaN(Number(dateCheck[2]))) {
      return [false, ''];
    }

    if (dateCheck.length !== 3 || dateCheck[0] > 12 || dateCheck[0] < 1 || dateCheck[1] > 31 || dateCheck[2].length !== 4 || dateCheck[2] !== '2017') {
      return [false, ''];
    }

    // if we make it down here, check formatting of the day and month in date (format to single digits if there is a leading 0)
    if (dateCheck[0] < 10 && dateCheck[0].length === 2) {
      monthFormatted = dateCheck[0].substring(1, dateCheck[0].length);
      dateCheck[0] = monthFormatted;
    }

    if (dateCheck[1] < 10 && dateCheck[1].length === 2) {
      dayFormatted = dateCheck[1].substring(1, dateCheck[1].length);
      dateCheck[1] = dayFormatted;
    }

    var formattedDate = dateCheck.join('/');

    // if all validations pass, we can return true and the formatted date if it needed to be formatted and continue with the forecast request
    return [true, formattedDate];
  }

})





var debug = require('debug')('leader:emailtoname');
var extend = require('extend');
var objCase = require('obj-case');
var Fullcontact = require('fullcontact');

var DELIM_REGEX = /[._-]+/;

/**
 * Create a new leader plugin.
 *
 * @params {String} apiKey
 * @returns {Object}
 */

module.exports = function (options) {
  return { fn: middleware(options), wait: wait};
};

module.exports.test = {
  parseUsername: parseUsername,
  fcAccurate: fcAccurate
};

/**
 * Create a Fullcontact name API leader plugin.
 *
 * @return {String} apiKey
 * @return {Function}
 */

function middleware (options) {
  var fullcontact = new Fullcontact(options.fullcontactApiKey);
  return function emailtonameParser (person, context, next) {
    // search for both email and username. go with higher probablity
    var username = getUsername(person, context);
    if (!username) return next();
    var parsed = parseUsername(username);
    if (confidentUserName(parsed)) {
      debug('Found valid name with string parsing only %s ..', parsed.name);
      extend(true, context, {emailtoname: {parsed: parsed} });
      extend(true, person, normalize(parsed));
      return next();
    } 
    debug('querying fullcontact with username %s ..', username);
    fullcontact.name.deducer({ username: username }, function (err, data) {
      if (err) data = {};
      debug('Got Fullcontact name: %j for username %s', data.nameDetails, username);
      extend(true, context, {emailtoname: {parsed: parsed, fcData: data} });
      // some component could be valid
      var merged = fcDetails(data, parsed, username);
      extend(true, person, normalize(merged));
      debug('Updated person name to %j from username: %s', merged, username);
      next();
    });
  };
}

/**
 * Copy the fullcontact company `profile` details to the `person.company`.
 *
 * @param {Object} profile
 * @param {Object} person
 */

function fcDetails (fcName, parsed, username) {
  // determine if fc is accurate
  // look for overlap between fc last name and username
  // look for overlap between fc first name and username
  // 
  if (!fcAccurate(fcName, username)) {
    //fc wasn't accurate - just return parsed
    debug('Fullcontact name data was not accurate');
    return parsed;
  }
  var merged = {};
  var stripedUsername = username.replace(/[\W_0-9]/g, '').toLowerCase();

  var ln = (fcName.nameDetails.familyName || '').toLowerCase();
  var fn = (fcName.nameDetails.givenName || '').toLowerCase();
  if (ln && fn) {
    // we presumably have an accurate first and last name
    merged.firstName = fn;
    merged.lastName = ln;
  } else if (ln) {
    var lnIndex = stripedUsername.indexOf(ln);
    if (lnIndex === stripedUsername.length - ln.length) {
      // last name was end of username - expected
      merged.firstName = stripedUsername.slice(0, stripedUsername.length - ln.length);
      merged.lastName = ln;
    } else if (lnIndex === 0 && DELIM_REGEX.test(username)) {
      // last name was beggining of username - less common
      // but we permit if username contains a delimiter
      merged.firstName = stripedUsername.slice(ln.length);
      merged.lastName = ln;
    } 
  } else if (fn) {
    var fnIndex = stripedUsername.indexOf(fn);
    if (fnIndex === 0) {
      // first name was beggining of username - expected
      merged.firstName = fn;
      merged.lastName = stripedUsername.slice(fn.length);
    } else if (fnIndex === stripedUsername.length - fn.length && DELIM_REGEX.test(username)) {
      // first name was end of username - less common
      // but we permit if username contains a delimiter
      merged.firstName = fn;
      merged.lastName = stripedUsername.slice(0, stripedUsername.length - fn.length);
    } 
  }
  if (merged.firstName || merged.lastName) {
    merged.name = (merged.firstName || '') + ' ' + (merged.lastName || '');
  }
  // consider parsed components?
  // consider lastName or firstName being set to abbreviation.
  return extend(true, parsed, merged);
}

/**
 * Wait until we have an interesting username available.
 * But don't run if we have a name from some other source.
 * TODO(ted) - update this when person fields get
 * probabilities associated with them.
 *
 * @param {Object} context
 * @param {Object} person
 * @return {Boolean}
 */

function wait (person, context) {
  return !person.name && getUsername(person, context);
}

function confidentUserName(parsed) {
  if (confidentName(parsed.firstName) && confidentName(parsed.lastName)) {
    return true;
  }
  return false;
}

function confidentName(name) {
  if (name && name[1]) {
    return true;
  }
  return false;
}

function parseUsername(username) {
  var uArr = username.split(DELIM_REGEX).filter(function(e) {return !!e;});

  var parsed = {name: uArr.join(' ').trim()};

  var firstName = uArr.slice(0, 1)[0];
  var lastName = uArr.slice(-1)[0];
  if (lastName !== firstName) {
    parsed.firstName = firstName;
    parsed.lastName = lastName;
  }
  return parsed;
}

function normalize(parsed) {
  Object.keys(parsed).forEach(function (k) {
    parsed[k] = normalizeName(parsed[k]);
  });
  return parsed;
}

function normalizeName(s) {
  return s.split(/\s+/)
    .filter(function(e) {return !!e;})
    .map(function(e) {return capitalize(e);})
    .map(function(e) { return e.length === 1 ? e + '.' : e;})
    .join(' ').trim();
}

function capitalize(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * Sanity check the name accuracy
 *
 * @param {Object} profile
 * @param {String} username
 */

function fcAccurate (data, username) {
  return data && data.likelihood > 0.5;
  // TODO(ted) - consider using levenstein filter
  // as a lowpass filter on each name to enser the overlap
  // between lastName || firstName and the source username
  // is still high.  I think gwintrob getting split into
  // gwin trob is unlikely for email even if it has a greater
  // probability than firstName = g, lastName = wintrob. 
  // leventhstein distance would compute higher for wintrob
  // on gwintrob than for either gwin or trob. 
}

/**
 * Get the username to search for
 *
 * @param {Object} context
 * @param {Object} person
 * @return {String}
 */

function getUsername (person, context) {
  var username;
  if (person.email) {
    username = person.email.split('@')[0];
  }
  // TODO(Ted) - consider parsing other userIds we may have
  // available - e.g. twitter handle.
  return username;
}
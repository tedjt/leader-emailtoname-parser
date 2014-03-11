
var assert = require('assert');
var should = require('should');
var plugin = require('..');

describe('leader-emailtoname-parser', function () {
  // ted.j.tomlinson
  // gwintrob
  // t.tomlinson
  // johng
  // stomlinson
  // t_tomlinson
  // ted_t
  // ted.t

  var emailToName = plugin({fullcontactApiKey: '997a4791ff2b8690'});

  var runTest = function(email, name, first, last) {
    return function (done) {
      var person = { email: email};
      var context = {};
      emailToName.fn(person, context, function (err) {
        if (err) return done(err);
        assert(person);
        console.log(person);
        person.name.should.equal(name);
        person.firstName.should.equal(first);
        person.lastName.should.equal(last);
        done();
      });
    };
  };

  it('should wait if theres no email', function () {
    var context = {}, person = {};
    assert(!emailToName.wait(person, context));
  });

  it('should not wait if there is an email', function () {
    var person = { email: 'ted.j.tomlinson@gmail.com'};
    var context = {};
    assert(emailToName.wait(person, context));
  });

  it('should pass accuracy if the name is > 0.5', function () {
    var data = {likelihood: 0.8};
    assert(plugin.test.fcAccurate(data, 'randomUserName'));
  });

  it('should fail accuracy if the name is < 0.5', function () {
    var data = {likelihood: 0.3};
    assert(!plugin.test.fcAccurate(data, 'randomUserName'));
  });

  it('should parse email to components', function () {
    var u = plugin.test.parseUsername('ted.j.tomlinson');
    u.firstName.should.equal('ted');
    u.lastName.should.equal('tomlinson');
    u.name.should.equal('ted j tomlinson');
    //assert(!fullcontactName.test.fcAccurate(data, 'randomUserName'));
  });

  it('should be able to resolve a valid fullcontact name', function (done) {
    var person = { email: 'ted.j.tomlinson@gmail.com' };
    var context = {};
    emailToName.fn(person, context, function (err) {
      if (err) return done(err);
      assert(person);
      console.log(person);
      person.name.should.equal('Ted J. Tomlinson');
      person.firstName.should.equal('Ted');
      person.lastName.should.equal('Tomlinson');
      done();
    });
  });

  it('hyon.lee', runTest('Hyon.lee@gmail.com', 'Hyon Lee', 'Hyon', 'Lee'));
  it('stomlinson', runTest('stomlinson@gmail.com', 'S. Tomlinson', 'S.', 'Tomlinson'));
  it('t_tomlinson', runTest('t_tomlinson@gmail.com', 'T. Tomlinson', 'T.', 'Tomlinson'));
  it('johng', runTest('johng@gmail.com', 'John G.', 'John', 'G.'));
  it('hwwatkins', runTest('hwwatkins@gmail.com', 'Hw Watkins', 'Hw', 'Watkins'));
  it('lukexie', runTest('lukexie@gmail.com', 'Luke Xie', 'Luke', 'Xie'));
  it('lxie', runTest('lxie@gmail.com', 'L. Xie', 'L.', 'Xie'));
  // we can't handle the truth 
  //it('gwintrob', runTest('gwintrob@gmail.com', 'G. Wintrob', 'G.', 'Wintrob'));

});

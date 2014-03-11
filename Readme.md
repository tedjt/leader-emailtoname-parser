
# leader-emailtoname-parser

  A [leader](https://github.com/ivolo/leader) plugin for to extract a name from an email address

## Example

```js
var Leader = require('leader');
var Emailtoname = require('leader-emailtoname-parser');

var leader = Leader()
  .use(emailtoname({
    fullcontactApiKey: 'xxxxx'
  }))
  .populate({ email: 'ted.j.tomlinson@gmail.com'}, function(err, person) {
    // ..
});
```

It will attempt to parse common email idioms such as . _ - as well as query the Fullcontact name api based on the US census data to return the most probable name match for the given email address or username (with domain stripped on email address).

Only sets the name if it is reasonably confident that it is correct.

And it will add the following to the `person`:

```js
{
  // ..
  name: 'Ted Tomlinson',
  firstName: 'Ted',
  lastName: 'Tomlinson'
}
```

## API

#### Emailtoname(options)

  Return a Leader plugin that parses name from an email.

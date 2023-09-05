module.exports.jsonFromURLRouteSchema = {
    'type': 'object',
    'items': {
        'properties': {
            'n': {'type': 'string', 'minLength': 1, 'maxLength': 25, 'pattern': '^[A-Za-z0-9_/+=]*$'},
            'i': {'type': 'string', 'minLength': 1, 'maxLength': 25, 'pattern': '^[A-Za-z0-9_]*$'},
            's': {'type': ['string', 'null', 'undefined'], 'minLength': 0, 'maxLength': 45, 'pattern': '^[A-Za-z0-9_]*$'},
        },
        'required': ['n', 'i'],
        'expected': ['n', 'i', 's']
    }
};

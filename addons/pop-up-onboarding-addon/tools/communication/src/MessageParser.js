export class MessageParser {
    constructor() {
        this.regexRules = [];
    }
    addRule(regex, spanClass) {
        this.regexRules.push({
            regex: regex,
            spanClass: spanClass
        });
    }
    parseText(text) {
        let results = {};
        this.regexRules.forEach(function(rule) {
            results[rule.spanClass] = text.match(rule.regex);
        });
        return results;
    }
    formatText(text) {
        let formattedText = text;
        this.regexRules.forEach(function(rule) {
            formattedText = formattedText.replace(rule.regex, '<span class="' + rule.spanClass + '">$&</span>');
        });
        return formattedText;
    }
}

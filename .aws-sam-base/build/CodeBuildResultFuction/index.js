const AWS = require('aws-sdk');

class handlePullRequests {
    constructor(options = {}) {
        this.codecommit = new AWS.CodeCommit();
    }

    _init_() {
        if (!String.prototype.format) {
            String.prototype.format = function () {
                var i = 0, args = arguments;
                return this.replace(/{}/g, function () {
                    return typeof args[i] != 'undefined' ? args[i++] : '';
                });
            };
        }
    }

    async process(event, context) {
        let response = {
            isBase64Encoded: false,
            statusCode: 200,
            headers: event.headers,
            body: {
                data: {},
                errors: [],
                statusCode: 200
            }
        };

        try {
            this._init_();

            let pull_request_id = "",
                repository_name = "",
                before_commit_id = "",
                after_commit_id = "",
                content = "";

            let env_variables = [];
            env_variables = event['detail']['additional-information']['environment']['environment-variables'];

            env_variables.forEach(item => {
                if (item.hasOwnProperty('name') || item.hasOwnProperty('value')) {
                    if (item.name == 'pullRequestId') pull_request_id = item.value;
                    if (item.name == 'repositoryName') repository_name = item.value;
                    if (item.name == 'sourceCommit') before_commit_id = item.value;
                    if (item.name == 'destinationCommit') after_commit_id = item.value;
                }
            });

            let s3_prefix = 's3-{}'.format(event['region']);
            let badge = "";

            let phases = [];
            phases = event['detail']['additional-information']['phases'];
            phases.forEach((item) => {
                if (item.hasOwnProperty('phase-status')) {
                    if (item['phase-status'] === 'FAILED') {
                        badge = 'https://{}.amazonaws.com/codefactory-{}-prod-default-build-badges/failing.svg'.format(s3_prefix, event['region']);
                        content = '![Failing]({} "Failing") - See the [Logs]({})'.format(badge, event['detail']['additional-information']['logs']['deep-link']);
                    } else {
                        badge = 'https://{}.amazonaws.com/codefactory-{}-prod-default-build-badges/passing.svg'.format(s3_prefix, event['region']);
                        content = '![Passing]({} "Passing") - See the [Logs]({})'.format(badge, event['detail']['additional-information']['logs']['deep-link']);
                    }
                }
            });

            let params = {
                pullRequestId: pull_request_id,
                repositoryName: repository_name,
                beforeCommitId: before_commit_id,
                afterCommitId: after_commit_id,
                content: content
            };

            let code_commit_response = await this.codecommit.postCommentForPullRequest(params).promise();
            console.log(`CodeCommit response => ${JSON.stringify(code_commit_response)}`);
            response.body.data = code_commit_response;
        } catch (error) {
            console.log(`ERROR: ${JSON.stringify(error)}`);
            response.body.statusCode = error.statusCode;
            response.statusCode = error.statusCode;
            response.body.errors.push(error);
        }

        response.body = JSON.stringify(response.body);
        return response;

    }

}

exports.lambdaHandler = async function (event, context) {
    const handler = new handlePullRequests();
    return handler.process(event, context);
};
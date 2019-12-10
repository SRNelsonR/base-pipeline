const AWS = require('aws-sdk');

class handlePullRequestsEvent {
    constructor(options = {}) {
        this.codecommit = new AWS.CodeCommit();
    }

    _init_(event) {
        if (event['detail'].hasOwnProperty('event')) {
            if (event['detail']['event'] === 'pullRequestSourceBranchUpdated' || event['detail']['event'] === 'pullRequestCreated') {
                console.log(`Values validations successfully completed `);
            } else {
                throw {
                    statusCode: 500,
                    message: `Missing Values in object event[detail][event] => "pullRequestSourceBranchUpdated" or "pullRequestCreated"`
                }
            }
        } else {
            throw {
                statusCode: 500,
                message: `Missing property in object event[detail] => "event"'`
            }
        }
    }

    async process(event, context) {
        let response = {
            isBase64Encoded: false,
            statusCode: 200,
            body: {
                data: {},
                errors: [],
                statusCode: 200
            }
        };
        try {

            this._init_(event);

            let fecha = new Date();

            let params = {
                pullRequestId: event.detail.pullRequestId,
                repositoryName: event.detail.repositoryNames[0],
                beforeCommitId: event.detail.sourceCommit,
                afterCommitId: event.detail.destinationCommit,
                content: '**Build started at **' + fecha
            };

            console.log('Params for post comment for pull request: ' + JSON.stringify(params));

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
    const handler = new handlePullRequestsEvent();
    return handler.process(event, context);
}
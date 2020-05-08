const core = require('@actions/core');
const exec = require('@actions/exec');
const github = require('@actions/github');

const ALL_ARGS = [
    'run', '--all-files', '--show-diff-on-failure', '--color=always'
];

const CHANGED_ARGS = [
    'run', '--show-diff-on-failure', '--color=always', '--files'
];


function addToken(url, token) {
    return url.replace(/^https:\/\//, `https://x-access-token:${token}@`)
}

async function getChangedFiles() {

    let changedFiles = '';
    const baseRef = core.getInput('base');

    const options = {};
    options.listeners = {
        stdout: (data) => {
            changedFiles += data.toString();
        },
    };

    await exec.exec('git', ['diff', baseRef, '--name-only'], options);

    return changedFiles;
}

async function main() {
    var ARGS

    await core.group('install pre-commit', async () => {
        await exec.exec('pip', ['install', 'pre-commit']);
        await exec.exec('pip', ['freeze', '--local']);
    });

    if (core.getInput('changed')) {
        ARGS = CHANGED_ARGS;
        fileList = await getChangedFiles();
        ARGS.push(fileList);
    }
    else {
        ARGS = ALL_ARGS;
    }

    const token = core.getInput('token');
    const pr = github.context.payload.pull_request;
    const push = !!token && !!pr;
    const ret = await exec.exec('pre-commit', ARGS, { ignoreReturnCode: push });
    if (ret && push) {
        // actions do not run on pushes made by actions.
        // need to make absolute sure things are good before pushing
        // TODO: is there a better way around this limitation?
        await exec.exec('pre-commit', ARGS);

        const diff = await exec.exec(
            'git', ['diff', '--quiet'], { ignoreReturnCode: true }
        );
        if (diff) {
            await core.group('push fixes', async () => {
                await exec.exec('git', ['config', 'user.name', 'pre-commit']);
                await exec.exec(
                    'git', ['config', 'user.email', 'pre-commit@example.com']
                );

                const branch = pr.head.ref;
                await exec.exec('git', ['checkout', 'HEAD', '-b', branch]);

                await exec.exec('git', ['commit', '-am', 'pre-commit fixes']);
                const url = addToken(pr.head.repo.clone_url, token);
                await exec.exec('git', ['remote', 'set-url', 'origin', url]);
                await exec.exec('git', ['push', 'origin', 'HEAD']);
            });
        }
    }
}

main().catch((e) => core.setFailed(e.message));

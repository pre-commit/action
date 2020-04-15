const core = require('@actions/core');
const exec = require('@actions/exec');
const github = require('@actions/github');

function addToken(url, token) {
    return url.replace(/^https:\/\//, `https://x-access-token:${token}@`)
}

async function main() {
    await core.group('install pre-commit', async () => {
        await exec.exec('pip', ['install', 'pre-commit']);
        await exec.exec('pip', ['freeze', '--local']);
    });

    const token = core.getInput('token');
    const source = core.getInput('source');
    const origin = core.getInput('origin');

    var args = [
        'run', '--show-diff-on-failure', '--color=always'
    ];

    if (source) {
        args.push('--source', source);
    }
    
    if (origin) {
        args.push('--origin', origin);
    }

    if (!!source && !!origin) {
        args.push('--all-files');
    }
    
    const pr = github.context.payload.pull_request;
    const push = !!token && !!pr;
    const ret = await exec.exec('pre-commit', args, {ignoreReturnCode: push});
    if (ret && push) {
        // actions do not run on pushes made by actions.
        // need to make absolute sure things are good before pushing
        // TODO: is there a better way around this limitation?
        await exec.exec('pre-commit', args);

        const diff = await exec.exec(
            'git', ['diff', '--quiet'], {ignoreReturnCode: true}
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

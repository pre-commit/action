const child_process = require('child_process');
const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');

const cache = require('@actions/cache');
const core = require('@actions/core');
const exec = require('@actions/exec');
const github = require('@actions/github');
const tr = require('@actions/exec/lib/toolrunner');

function hashString(content) {
    const sha256 = crypto.createHash('sha256');
    return sha256.update(content).digest('hex');
}

function getPythonVersion() {
    const args = ['-c', 'import sys;print(sys.executable+"\\n"+sys.version)'];
    const res = child_process.spawnSync('python', args);
    if (res.status !== 0) {
        throw 'python version check failed';
    }
    return res.stdout.toString();
}

function hashFile(filePath) {
    return hashString(fs.readFileSync(filePath).toString());
}

function addToken(url, token) {
    return url.replace(/^https:\/\//, `https://x-access-token:${token}@`);
}

async function main() {
    await core.group('install pre-commit', async () => {
        await exec.exec('pip', ['install', 'pre-commit']);
        await exec.exec('pip', ['freeze', '--local']);
    });

    const args = [
        'run',
        '--show-diff-on-failure',
        '--color=always',
        ...tr.argStringToArray(core.getInput('extra_args')),
    ];
    const token = core.getInput('token');
    const git_user_name = core.getInput('git_user_name');
    const git_user_email = core.getInput('git_user_email');
    const pr = github.context.payload.pull_request;
    const push = !!token && !!pr;

    const cachePaths = [path.join(os.homedir(), '.cache', 'pre-commit')];
    const py = getPythonVersion();
    const cacheKey = `pre-commit-2-${hashString(py)}-${hashFile('.pre-commit-config.yaml')}`;
    const restored = await cache.restoreCache(cachePaths, cacheKey);
    const ret = await exec.exec('pre-commit', args, {ignoreReturnCode: push});
    if (!restored) {
        try {
            await cache.saveCache(cachePaths, cacheKey);
        } catch (e) {
            core.warning(
                `There was an error saving the pre-commit environments to cache:

                ${e.message || e}

                This only has performance implications and won't change the result of your pre-commit tests.
                If this problem persists on your default branch, you can try to fix it by editing your '.pre-commit-config.yaml'.
                For example try to run 'pre-commit autoupdate' or simply add a blank line.
                This will result in a different hash value and thus a different cache target.`.replace(/^ +/gm, '')
            );
        }
    }

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
                await exec.exec('git', ['config', 'user.name', git_user_name]);
                await exec.exec(
                    'git', ['config', 'user.email', git_user_email]
                );

                const branch = pr.head.ref;
                await exec.exec('git', ['checkout', 'HEAD', '-B', branch]);

                await exec.exec('git', ['commit', '-am', 'pre-commit fixes']);
                const url = addToken(pr.head.repo.clone_url, token);
                await exec.exec('git', ['push', url, 'HEAD']);
            });
        }
    }
}

main().catch((e) => core.setFailed(e.message));

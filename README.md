[![Build Status](https://github.com/pre-commit/action/workflows/deploy/badge.svg)](https://github.com/pre-commit/action/actions)

pre-commit/action
=================

A GitHub action to run [pre-commit](https://pre-commit.com).

## How to

### Setup

To use this action, make a file `.github/workflows/pre-commit.yml`.  The following template will get you started:

```yaml
name: pre-commit

on:
  pull_request:
  push:
    branches: [master]

jobs:
  pre-commit:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v2
    - uses: actions/setup-python@v2
    - uses: pre-commit/action@v2.0.0
```

This does a few things:

- Clones the code
- Installs python
- Sets up the `pre-commit` cache

### With custom invocations

By default, this action runs all the hooks against all the files.  `extra_args` lets users specify a single hook id and/or options to pass to `pre-commit run`.

Here's a sample step configuration that only runs the `flake8` hook against all the files (use the template above except for the `pre-commit` action):

```yaml
- uses: pre-commit/action@v2.0.0
  with:
    extra_args: flake8 --all-files
```

### In private repositories

This action also provides an additional behaviour when used in private repositories. When configured with a GitHub token, the action will push back fixes to the pull request branch.

Using the template above, you'll need to make two replacements for individual actions:

First is the checkout step, which needs to use unlimited fetch depth for pushing:

```yaml
    - uses: actions/checkout@v2
      with:
        fetch-depth: 0
```

Next is passing the token to the `pre-commit` action:

```yaml
    - uses: pre-commit/action@v2.0.0
      with:
        token: ${{ secrets.GITHUB_TOKEN }}
```

Note that `secrets.GITHUB_TOKEN` is [automatically provisioned](https://docs.github.com/en/free-pro-team@latest/actions/reference/authentication-in-a-workflow#about-the-github_token-secret) and will not
require any special configuration.

While you could _technically_ configure this for a public repository (using a personal access token), I can't think of a way to do this safely without exposing a privileged token to pull requests – if you have any ideas, please leave an [issue](https://github.com/pre-commit/action/issues)!

## Troubleshooting

### Changes aren't commited.

1. The _push back_ behaviour is only enabled for pull requests, not for pushes directly to branches.

  Make sure that your `.github/workflows/pre-commit.yml` contains at least:

  ```YAML
  on:  
    pull_request:
    ```

2. Your pre-commit actions contain a conflict.

  If `pre-commit` fails on the second invocation it can't push to the branch because GitHub actions does not fire on pushes made by GitHub actions, so it marks the job as failed.

  _For example:_ Using both `double-quote-string-fixer` and `black` will cause the action to fail since both will format strings differently (Unless you pass `-S [skip-string-normalization]` to `black`) and will prevent them from reaching an agreement.

### Actions cannot write to file.

1. This happens when the action is trying to change a workflow file and is prohibited by [GitHub](https://github.community/t/refusing-to-allow-an-integration-to-create-or-update/16326/2).

  **Example error:**
  ```bash
  ! [remote rejected] HEAD -> test (refusing to allow a GitHub App to create or update workflow `.github/workflows/pre-commit.yml` without `workflows` permission)
  ```

 **Fix:**
 Exclude the workflow file from the action through top level [`exclude`](https://pre-commit.com/#top_level-exclude) or hook level [`exclude`](https://pre-commit.com/#config-exclude).

 **Example regex** (For top level excluding, to be added to `.pre-commit-config.yaml`):
 ```YAML
 exclude: '.github/workflows/.*?\.yml'
 ```

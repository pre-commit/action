[![Build Status](https://github.com/pre-commit/action/workflows/deploy/badge.svg)](https://github.com/pre-commit/action/actions)

pre-commit/action
=================

a GitHub action to run [pre-commit](https://pre-commit.com)

### using this action

To use this action, make a file `.github/workflows/pre-commit.yml`.  Here's a
template to get started:

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
    - uses: actions/checkout@v1
    - uses: actions/setup-python@v1
    - name: set PY
      run: echo "::set-env name=PY::$(python --version | sha256sum | cut -d' ' -f1)"
    - uses: actions/cache@v1
      with:
        path: ~/.cache/pre-commit
        key: pre-commit|${{ env.PY }}|${{ hashFiles('.pre-commit-config.yaml') }}
    - uses: pre-commit/action@v1.0.1
```

This does a few things:

- clones the code
- installs python
- sets up the `pre-commit` cache

Hopefully in the future when `actions` matures the yaml can be simplified.

### using this action in private repositories

this action also provides an additional behaviour when used in private
repositories.  when configured with a github token, the action will push back
fixes to the pull request branch.

here's an example configuration for that (use the template above except for the
`pre-commit` action):

```yaml
    - uses: pre-commit/action@v1.0.1
      with:
        token: ${{ secrets.GITHUB_TOKEN }}
```

note that `secrets.GITHUB_TOKEN` is automatically provisioned and will not
require any special configuration.

while you could _technically_ configure this for a public repository (using a
personal access token), I can't think of a way to do this safely without
exposing a privileged token to pull requests -- if you have any ideas, please
leave an issue!

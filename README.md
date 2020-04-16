[![Build Status](https://github.com/pre-commit/action/workflows/deploy/badge.svg)](https://github.com/pre-commit/action/actions)

# pre-commit/action


a GitHub action to run [pre-commit](https://pre-commit.com)

## Usage

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
      run: echo "::set-env name=PY::$(python -c 'import hashlib, sys;print(hashlib.sha256(sys.version.encode()+sys.executable.encode()).hexdigest())')"
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

### Support for Private Repositories

This action also provides an additional behaviour when used in private
repositories. When configured with a GitHub token, the action will push back
fixes to the pull request branch.

Here's an example configuration for that (use the template above except for the
`pre-commit` action):

```yaml
    - uses: pre-commit/action@v1.0.1
      with:
        token: ${{ secrets.GITHUB_TOKEN }}
```

Note that `secrets.GITHUB_TOKEN` is automatically provisioned and will not
require any special configuration.

While you could _technically_ configure this for a public repository (using a
personal access token), I can't think of a way to do this safely without
exposing a privileged token to pull requests -- if you have any ideas, please
leave an issue!

### Commit Range

In situations where you would like to check only files modified in the pull request
you can specify the commit range using `source` for base reference sha and `origin`
for head reference sha.

```yaml
    - uses: jirikuncar/action@release  # change to pre-commit/action@release after merging this PR
      with:
        source: ${{ github.event.pull_request.base.sha }}
        origin: ${{ github.event.pull_request.head.sha }}
```


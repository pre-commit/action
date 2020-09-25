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
    - uses: actions/checkout@v2
    - uses: actions/setup-python@v2
    - uses: pre-commit/action@v2.0.0
```

This does a few things:

- clones the code
- installs python
- sets up the `pre-commit` cache

### using this action with custom invocations

By default, this action runs all the hooks against all the files.  `extra_args`
lets users specify a single hook id and/or options to pass to `pre-commit run`.

Here's a sample step configuration that only runs the `flake8` hook against all
the files (use the template above except for the `pre-commit` action):

```yaml
    - uses: pre-commit/action@v2.0.0
      with:
        extra_args: flake8 --all-files
```

### using this action in private repositories

this action also provides an additional behaviour when used in private
repositories.  when configured with a github token, the action will push back
fixes to the pull request branch.

using the template above, you'll make two replacements for individual actions:

first is the checkout step, which needs to use unlimited fetch depth for
pushing

```yaml
    - uses: actions/checkout@v2
      with:
        fetch-depth: 0
```

next is passing the token to the pre-commit action

```yaml
    - uses: pre-commit/action@v2.0.0
      with:
        token: ${{ secrets.GITHUB_TOKEN }}
```

note that `secrets.GITHUB_TOKEN` is automatically provisioned and will not
require any special configuration.

### using this action to push to public repository pull requests

This action can push to pull requests in public repositories using the [`pull_request_target`](https://docs.github.com/en/free-pro-team@latest/actions/reference/events-that-trigger-workflows#pull_request_target).
Remember that code in a public PR may be untrusted.

```yaml
name: pre-commit

on:

  pull_request_target:

jobs:
  pre-commit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
        with:
          repository: ${{ github.event.pull_request.head.repo.full_name }}
          # Use sha instead of ref because pre-commit attempts to checkout a branch with the same name
          # https://github.com/pre-commit/action/blob/20242c769824ac7e54269ee9242da5bfae19c1c8/index.js#L77
          ref: ${{ github.event.pull_request.head.sha }}
          fetch-depth: 0
      - uses: actions/setup-python@v2
      - uses: pre-commit/action@v2.0.0
        with:
          token: ${{ secrets.GITHUB_TOKEN }}
```

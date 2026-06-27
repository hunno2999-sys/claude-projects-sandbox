# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository purpose

This is a small sandbox repo used to practice the GitHub workflow with Claude Code. It is intentionally minimal — do not assume larger application structure exists.

## Structure

- `hello.py` — defines `greet(name="world")`, returning `f"Hello, {name}!"`. Runs as a script via `python hello.py`.
- `test_hello.py` — pytest tests for `greet`, importing directly from `hello`.
- `README.md` — getting-started instructions (clone and run `python hello.py`).

## Commands

- Run the script: `python hello.py`
- Run tests: `pytest test_hello.py` (or `pytest` to run all tests)
- Run a single test: `pytest test_hello.py::test_greet_default`

There is no build step, linter config, or package manifest (no `requirements.txt`/`pyproject.toml`) in this repo — only the Python standard library and `pytest` (assumed available in the environment) are needed.

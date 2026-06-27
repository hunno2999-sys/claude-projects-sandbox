from hello import greet


def test_greet_default():
    assert greet() == "Hello, world!"


def test_greet_with_name():
    assert greet("Claude") == "Hello, Claude!"

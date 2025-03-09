import json
import os
import yaml
from env import DATA_DIR

BASE_DIR = DATA_DIR

config_path = os.getenv("BASE_PATH", f"{BASE_DIR}/config.yaml")
print("config path", config_path)


def load_configs():
    with open(config_path, "r", encoding="utf-8") as f:
        file_config = yaml.safe_load(f)

    return file_config


def load_env_name(config):
    all_env_keys = []

    def dfs(config, value):
        if type(config) is not dict:
            all_env_keys.append(value)
            return
        if value != "":
            value += "_"
        for key in config:
            dfs(config[key], value + key.upper())

    dfs(config, "")
    return all_env_keys


def rewrite_config_with_env(config, all_env):
    for key in all_env:
        value = os.getenv(key)
        if value:
            a = key.split("_", 1)
            config[a[0].lower()][a[1].lower()] = value
    return config


config = load_configs()
keys = load_env_name(config)
config = rewrite_config_with_env(config, keys)
print("config", json.dumps(config, indent=2, ensure_ascii=False))

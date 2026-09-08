#!/usr/bin/env bash
set -e
cd "$(dirname "$0")/.."
python ml/scripts/generate_training_data.py
python ml/scripts/train_model.py

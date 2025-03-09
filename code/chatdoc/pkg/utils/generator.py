'''
Author: longsion<xianglong_chen@intsig.net>
Date: 2024-07-04 20:55:25
LastEditors: longsion
LastEditTime: 2024-07-16 23:04:30
'''


def batch_generator(iterator, batch_size):
    batch = []
    iterator = iter(iterator)
    try:
        while True:
            for _ in range(batch_size):
                batch.append(next(iterator))
            yield batch
            batch = []
    except StopIteration:
        if batch:  # 如果最后一个批次不足 batch_size 也返回
            yield batch


def batch_generator_with_index(iterator, batch_size):
    batch = []
    iterator = iter(iterator)

    idx = 0
    try:
        while True:
            for _ in range(batch_size):
                batch.append(next(iterator))
            yield (idx, batch)
            idx += 1
            batch = []
    except StopIteration:
        if batch:  # 如果最后一个批次不足 batch_size 也返回
            yield (idx, batch)

'''
Author: longsion<xianglong_chen@intsig.net>
Date: 2024-07-16 17:43:07
LastEditors: longsion
LastEditTime: 2024-07-16 17:43:09
'''


from collections import OrderedDict
import time
import threading
import weakref
from concurrent.futures import ThreadPoolExecutor


def lru_cache_function(max_size=1024, expiration=15 * 60, **kwargs):
    """
    >>> @lru_cache_function(max_size=3, expiration=1)
    ... def f(x):
    ...    print("Calling f(" + str(x) + ")")
    ...    return x
    >>> f(3)
    Calling f(3)
    3
    >>> f(3)
    3
    """
    def wrapper(func):
        return LRUCachedFunction(func, LRUCacheDict(
            max_size=max_size, expiration=expiration, **kwargs))
    return wrapper


def _lock_decorator(func):
    """
    If the LRUCacheDict is concurrent, then we should lock in order to avoid
    conflicts with threading, or the ThreadTrigger.
    """

    def withlock(self, *args, **kwargs):
        if self.concurrent:
            with self._rlock:
                return func(self, *args, **kwargs)
        else:
            return func(self, *args, **kwargs)
    withlock.__name__ == func.__name__
    return withlock


class LRUCacheDict(object):
    """ A dictionary-like object, supporting LRU caching semantics.

    >>> d = LRUCacheDict(max_size=3, expiration=3)
    >>> d['foo'] = 'bar'
    >>> d['foo']
    'bar'
    >>> import time
    >>> time.sleep(4) # 4 seconds > 3 second cache expiry of d
    >>> d['foo']
    Traceback (most recent call last):
        ...
    KeyError: 'foo'
    >>> d['a'] = 'A'
    >>> d['b'] = 'B'
    >>> d['c'] = 'C'
    >>> d['d'] = 'D'
    >>> d['a'] # Should return value error, since we exceeded the max cache size
    Traceback (most recent call last):
        ...
    KeyError: 'a'

    By default, this cache will only expire items whenever you poke it - all methods on
    this class will result in a cleanup. If the thread_clear option is specified, a background
    thread will clean it up every thread_clear_min_check seconds.

    If this class must be used in a multithreaded environment, the option concurrent should be
    set to true. Note that the cache will always be concurrent if a background cleanup thread
    is used.
    """

    def __init__(self, max_size=1024, expiration=15 * 60, thread_clear=False, thread_clear_min_check=60, concurrent=False):
        self.max_size = max_size
        self.expiration = expiration

        self.__values = {}
        self.__expire_times = OrderedDict()
        self.__access_times = OrderedDict()
        self.thread_clear = thread_clear
        self.concurrent = concurrent or thread_clear
        if self.concurrent:
            self._rlock = threading.RLock()
        if thread_clear:
            t = self.EmptyCacheThread(self)
            t.start()

    class EmptyCacheThread(threading.Thread):
        daemon = True

        def __init__(self, cache, peek_duration=60):
            me = self

            def kill_self(o):
                me
            self.ref = weakref.ref(cache)
            self.peek_duration = peek_duration
            super(LRUCacheDict.EmptyCacheThread, self).__init__()

        def run(self):
            while self.ref():
                c = self.ref()
                if c:
                    next_expire = c.cleanup()
                    if (next_expire is None):
                        time.sleep(self.peek_duration)
                    else:
                        time.sleep(next_expire + 1)
                c = None

    @_lock_decorator
    def size(self):
        return len(self.__values)

    @_lock_decorator
    def clear(self):
        """
        Clears the dict.

        >>> d = LRUCacheDict(max_size=3, expiration=1)
        >>> d['foo'] = 'bar'
        >>> d['foo']
        'bar'
        >>> d.clear()
        >>> d['foo']
        Traceback (most recent call last):
        ...
        KeyError: 'foo'
        """
        self.__values.clear()
        self.__expire_times.clear()
        self.__access_times.clear()

    def __contains__(self, key):
        return self.has_key(key)

    @_lock_decorator
    def has_key(self, key):
        """
        This method should almost NEVER be used. The reason is that between the time
        has_key is called, and the key is accessed, the key might vanish.

        You should ALWAYS use a try: ... except KeyError: ... block.

        >>> d = LRUCacheDict(max_size=3, expiration=1)
        >>> d['foo'] = 'bar'
        >>> d['foo']
        'bar'
        >>> import time
        >>> if d.has_key('foo'):
        ...    time.sleep(2) #Oops, the key 'foo' is gone!
        ...    d['foo']
        Traceback (most recent call last):
        ...
        KeyError: 'foo'
        """
        return key in self.__values

    @_lock_decorator
    def __setitem__(self, key, value):
        t = int(time.time())
        self.__delitem__(key)
        self.__values[key] = value
        self.__access_times[key] = t
        self.__expire_times[key] = t + self.expiration
        self.cleanup()

    @_lock_decorator
    def __getitem__(self, key):
        t = int(time.time())
        del self.__access_times[key]
        self.__access_times[key] = t
        self.cleanup()
        return self.__values[key]

    @_lock_decorator
    def __delitem__(self, key):
        if key in self.__values:
            del self.__values[key]
            del self.__expire_times[key]
            del self.__access_times[key]

    @_lock_decorator
    def cleanup(self):
        if self.expiration is None:
            return None
        t = int(time.time())
        # Delete expired
        keys_to_delete = []
        next_expire = None
        for k in self.__expire_times:
            if self.__expire_times[k] < t:
                keys_to_delete.append(k)
            else:
                next_expire = self.__expire_times[k]
                break
        while keys_to_delete:
            self.__delitem__(keys_to_delete.pop())

        # If we have more than self.max_size items, delete the oldest
        while (len(self.__values) > self.max_size):
            keys_to_delete = []
            for k in self.__access_times:
                keys_to_delete.append(k)
                break
            while keys_to_delete:
                self.__delitem__(keys_to_delete.pop())
        if not (next_expire is None):
            return next_expire - t
        else:
            return None


class LRUCachedFunction(object):
    """
    A memoized function, backed by an LRU cache.

    >>> def f(x):
    ...    print("Calling f(" + str(x) + ")")
    ...    return x
    >>> f = LRUCachedFunction(f, LRUCacheDict(max_size=3, expiration=3) )
    >>> f(3)
    Calling f(3)
    3
    >>> f(3)
    3
    >>> import time
    >>> time.sleep(4) #Cache should now be empty, since expiration time is 3.
    >>> f(3)
    Calling f(3)
    3
    >>> f(4)
    Calling f(4)
    4
    >>> f(5)
    Calling f(5)
    5
    >>> f(3) #Still in cache, so no print statement. At this point, 4 is the least recently used.
    3
    >>> f(6)
    Calling f(6)
    6
    >>> f(4) #No longer in cache - 4 is the least recently used, and there are at least 3 others items in cache [3,4,5,6].
    Calling f(4)
    4

    """

    def __init__(self, function, cache=None, cache_key_suffix: str = None):
        if cache:
            self.cache = cache
        else:
            self.cache = LRUCacheDict()
        self.function = function
        self._cache_key_suffix = cache_key_suffix or self.function.__name__

    def __call__(self, *args, **kwargs):
        key = repr((args, kwargs)) + "#" + self._cache_key_suffix  # In principle a python repr(...) should not return any # characters.
        try:
            return self.cache[key]
        except KeyError:
            value = self.function(*args, **kwargs)
            self.cache[key] = value
            return value


class BatchCacheManager:
    def __init__(self, function, cache, batch_size: int = None, cache_key_suffix: str = None, thread_pool: ThreadPoolExecutor = None):
        self.function = function
        self.cache = cache or LRUCacheDict()
        self.batch_size = batch_size
        self._cache_key_suffix = cache_key_suffix or self.function.__name__
        self._thread_pool = thread_pool

    def __call__(self, inputs, *args, **kwargs):
        result = []
        to_request = []
        request_indices = []

        # 检查每个输入是否在缓存中
        for i, input in enumerate(inputs):
            cache_key = self._generate_cache_key(input, *args, **kwargs)
            try:
                # 从缓存获取结果
                result.append(self.cache[cache_key])
            except KeyError:
                # 需要请求的加入列表
                to_request.append(input)
                request_indices.append(i)
                result.append(None)  # 占位符

        # 如果有未缓存的项，进行批处理请求
        if to_request:
            batched_results = self._process_batches(to_request, *args, **kwargs)
            # 填充结果到正确的位置
            for idx, res in zip(request_indices, batched_results):
                cache_key = self._generate_cache_key(inputs[idx], *args, **kwargs)
                self.cache[cache_key] = res
                result[idx] = res

        return result

    def _process_batches(self, inputs, *args, **kwargs):
        if self.batch_size:
            groups = [inputs[i:i + self.batch_size] for i in range(0, len(inputs), self.batch_size)]
            results = []

            if self._thread_pool:
                futures = [self._thread_pool.submit(self.function, group, *args, **kwargs) for group in groups if group]
                for future in futures:
                    results.extend(future.result())
            else:
                for group in groups:
                    results.extend(self.function(group, *args, **kwargs))

        else:
            results = self.function(group, *args, **kwargs)

        return results

    def _generate_cache_key(self, input, *args, **kwargs):
        return repr((input, args, kwargs)) + "#" + self._cache_key_suffix


if __name__ == "__main__":
    import doctest
    doctest.testmod()

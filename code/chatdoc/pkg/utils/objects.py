'''
Author: longsion<xianglong_chen@intsig.net>
Date: 2024-10-23 16:20:02
LastEditors: longsion
LastEditTime: 2024-10-23 16:42:18
'''


from typing import Any, TypeVar
from pydantic import BaseModel

from pydantic._internal._model_construction import object_setattr as _object_setattr
Model = TypeVar('Model', bound='BaseModel')


class IFBaseModel(BaseModel):

    @classmethod
    def if_model_construct(cls: type[Model], **values: Any) -> Model:
        """Creates a new instance of the `Model` class with validated data.

        Creates a new model setting `__dict__` and `__pydantic_fields_set__` from trusted or pre-validated data.
        Default values are respected, but no other validation is performed.
        Behaves as if `Config.extra = 'allow'` was set since it adds all passed values

        Args:
            _fields_set: The set of field names accepted for the Model instance.
            values: Trusted or pre-validated data dictionary.

        Returns:
            A new instance of the `Model` class with validated data.
        """
        m = cls.__new__(cls)
        fields_values = values
        # _fields_set = set(fields_values.keys())

        _extra: dict[str, Any] | None = None
        _object_setattr(m, '__dict__', fields_values)
        # _object_setattr(m, '__pydantic_fields_set__', _fields_set)
        if not cls.__pydantic_root_model__:
            _object_setattr(m, '__pydantic_extra__', _extra)

        if cls.__pydantic_post_init__:
            m.model_post_init(None)
        elif not cls.__pydantic_root_model__:
            # Note: if there are any private attributes, cls.__pydantic_post_init__ would exist
            # Since it doesn't, that means that `__pydantic_private__` should be set to None
            _object_setattr(m, '__pydantic_private__', None)

        return m

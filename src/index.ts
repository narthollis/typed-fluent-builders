type ArrayValue<T> = T extends ReadonlyArray<infer U> ? U : any;

type ProxiedBuilderValue<TThis, TBuilder extends FluentBuilder<any>, TValue> = TValue extends (...args: any[]) => any
    ? ReturnType<TValue> extends TBuilder
        ? (...args: Parameters<TValue>) => ProxiedBuilder<TThis, TBuilder>
        : ReturnType<TValue> extends FluentBuilder<infer U>
        ? (...args: Parameters<TValue>) => ProxiedBuilder<TThis, FluentBuilder<U>>
        : TValue
    : TValue;

export type ProxiedBuilder<TThis, TBuilder extends FluentBuilder<any>> = {
    [P in keyof TBuilder]: ProxiedBuilderValue<TThis, TBuilder, TBuilder[P]>;
} & { return(): TThis };

export type ArrayBuilder<TThis extends FluentBuilder<any>, TBuilder extends FluentBuilder<any>> = {
    add(): ProxiedBuilder<ArrayBuilder<TThis, TBuilder>, TBuilder>;
    return(): TThis;
};

export abstract class FluentBuilder<T extends { [key: string]: any }> {
    protected abstract getInitial(): T;

    protected readonly current: Readonly<T> = this.getInitial();

    protected constructor(current?: T);
    protected constructor(update: Partial<T>, self: FluentBuilder<T>);
    protected constructor(currentOrUpdate?: Partial<T>, self?: FluentBuilder<T>) {
        this.current = {
            ...this.getInitial(),
            ...self?.current,
            ...currentOrUpdate,
        };
    }

    public build(): T {
        const clone = {} as { -readonly [P in keyof T]: T[P] };

        for (const prop of Reflect.ownKeys(this.current) as ReadonlyArray<keyof T>) {
            const value = this.current[prop];

            clone[prop] = value;
        }

        return clone as T;
    }

    protected withBuilderProxy<
        TKey extends keyof T,
        TBuilder extends FluentBuilder<T[TKey]>,
        TThis extends FluentBuilder<T>
    >(key: TKey, builder: TBuilder, newFn: (obj: T[TKey]) => TThis): ProxiedBuilder<TThis, TBuilder> {
        const proxyHandler: ProxyHandler<TBuilder> = {
            get(target, prop, receiver) {
                if (prop === 'return') {
                    return () => newFn(receiver.build());
                }

                const realProp = Reflect.get(target, prop, receiver);

                if (typeof realProp === 'function') {
                    return new Proxy(realProp, {
                        apply(target, thisArg, argumentsList) {
                            return new Proxy(Reflect.apply(target, thisArg, argumentsList), proxyHandler);
                        },
                    });
                }
                return realProp;
            },
        };

        return new Proxy(builder, proxyHandler) as ProxiedBuilder<TThis, TBuilder>;
    }

    protected withArrayProxy<
        TKey extends keyof T,
        TBuilder extends FluentBuilder<ArrayValue<T[TKey]>>,
        TThis extends FluentBuilder<T>,
        TArray extends T[TKey] & any[] = T[TKey] & any[]
    >(key: TKey, builder: { Create(): TBuilder }, newFn: (obj: TArray) => TThis): ArrayBuilder<TThis, TBuilder> {
        const arr: TArray = [] as TArray;
        
        let arrayBuilder: ArrayBuilder<TThis, TBuilder>;

        const proxyHandler: ProxyHandler<TBuilder> = {
            get(target, prop, receiver) {
                if (prop === 'return') {
                    arr.push(receiver.build());

                    return () => arrayBuilder;
                }

                const realProp = Reflect.get(target, prop, receiver);

                if (typeof realProp === 'function') {
                    return new Proxy(realProp, {
                        apply(target, thisArg, argumentsList) {
                            return new Proxy(Reflect.apply(target, thisArg, argumentsList), proxyHandler);
                        },
                    });
                }

                return realProp;
            }
        }

        arrayBuilder = {
            add() {
                return new Proxy(
                    builder.Create(),
                    proxyHandler,
                ) as ProxiedBuilder<ArrayBuilder<TThis, TBuilder>, TBuilder>;
            },
            return() {
                return newFn(arr);
            },
        };

        return arrayBuilder;
    }
}

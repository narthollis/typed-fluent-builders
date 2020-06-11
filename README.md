# typed-fluent-builders

Helper abstract class for creating Fluent Builders for use in creating test objects.

All Fluent Builder objets here are immutable, allowing for quick change testing.


## Example Usage

### Tests
```typescript
import { A, An } from './builders';

test('example', () => {
    const p = A.Person
        .named().withGiven('Alice').withFamily('Jones').return()
        .aged(51)
        .withPhoneNumbers()
            .add().ofKind('work').valued('555 124 1241').return()
            .add().ofKind('home').valued('555 421 1241').return()
            .add().ofKind('mobile').valued('1234 567 890').return()
            .return()
        .build();
    
    expect(p).toEqual({
        name: {
            given: 'Alice',
            family: 'Jones',
        },
        age: 51,
        phoneNumbers: [
            { kind: 'work', value: '555 124 1241' },
            { kind: 'home', value: '555 421 1241' },
            { kind: 'mobile', value: '1234 567 890' }
        ],
    })
});

test('example immutable', () => {
    const base = A.Person
        .named().withGiven('Alice').withFamily('Jones').return()
        .aged(51)
        .withPhoneNumbers()
            .add().ofKind('work').valued('555 124 1241').return()
            .add().ofKind('home').valued('555 421 1241').return()
            .add().ofKind('mobile').valued('1234 567 890').return()
            .return()
    
    const personA = base.build();
    const personB = base.aged(21).named().withGiven('Susan').build();

    expect(personA.phoneNumbers).toEqual(personB.phoneNumbers);

    expect(personA.name.given).not.toBe(personB.name.given);
    expect(personA.name.family).toBe(personB.name.family);

    expect(personA.age).toBe(51);
    expect(personB.age).toBe(21);
});
```

### Builders
```typescript
import { FluentBuilder, ProxiedBuilder, ArrayBuilder } from 'typed-fluent-builders';

interface Name {
    given: string;
    family: string;
}

interface Phone {
    kind: 'mobile' | 'work' | 'home';
    value: string;
}

interface Person {
    name: string;
    age: number;
    phoneNumbers: Phone[];
}

NameBuilder extends FluentBuilder<Name> {
    public static Create(name?: Name): NameBuilder {
        return new NameBuilder(name);
    }

    protected getInitial(): Name {
        return {
            given: 'Jane',
            family: 'Smith',
        };
    }

    withGiven(given: string): NameBuilder {
        return new NameBuilder({ given }, this);
    }

    withFamily(family: string): NameBuilder {
        return new NameBuilder({ family }, this);
    }
}

PhoneBuilder extends FluentBuilder<Phone> {
    public static Create(phone?: Phone): PhoneBuilder {
        return new PhoneBuilder(phone);
    }

    protected getInitial(): Phone {
        return {
            kind: 'mobile',
            value: '1234 567 890',
        };
    }

    public ofKind(kind: 'module' | 'work' | 'home'): PhoneBuilder {
        return new PhoneBuilder({ kind }, this);
    }

    public valued(value: string): PhoneBuilder {
        return new PhoneBuilder({ value }, this);
    }
}

PersonBuilder extends FluentBuilder<Person> {
    public static Create(person?: Person): PersonBuilder {
        return new PersonBuilder(person);
    }

    protected getInitial(): HumanName {
        return {
            name: {
                given: 'Jane',
                family: 'Smith',
            },
            age: 36,
            phoneNumbers: [],
        };
    }

    public aged(age: number): PersonBuilder {
        return new PersonBuilder({ person });
    }

    public named(): ProxiedBuilder<PersonBuilder, NameBuilder> {
        return this.withBuilderProxy(
            'name',
            NameBuilder.Create(this.current.name),
            (name) => new PersonBuilder({ name }, this),
        );
    }

    public withPhoneNumbers(): ArrayBuilder<PersonBuilder, PhoneBuilder> {
        return this.withArrayProxy(
            'phoneNumbers',
            PhoneBuilder,
            (phoneNumbers) => new PersonBuilder({ phoneNumbers }, this);
        );
    }
}


export const A = {
    get Person(): PersonBuilder {
        return PersonBuilder.Create();
    },
    get Phone(): PhoneBuilder {
        return PhoneBuilder.Create();
    },
    get Name(): NameBuilder {
        return NameBuilder.Create();
    },
} as const;

export const An = {} as const;

```